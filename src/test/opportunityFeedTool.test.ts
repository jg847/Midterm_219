import { describe, expect, it, vi } from "vitest";

vi.mock("@/frameworks/providers/jobs/usajobsClient", () => ({
  searchUsaJobs: vi.fn(async () => [
    {
      source: "usajobs",
      id: "u1",
      title: "Support Analyst",
      company: "City Agency",
      location: "Austin, TX",
      url: "https://example.com/u1",
      salaryMin: 45000,
      salaryMax: 60000,
    },
  ]),
}));

vi.mock("@/frameworks/providers/jobs/adzunaClient", () => ({
  searchAdzuna: vi.fn(async () => []),
}));

vi.mock("@/frameworks/providers/rentcast/rentcastClient", () => ({
  searchRentcast: vi.fn(async () => [
    {
      id: "r1",
      formattedAddress: "123 Main St",
      city: "Austin",
      state: "TX",
      bedrooms: 1,
      bathrooms: 1,
      rent: 1450,
      source: "rentcast",
    },
  ]),
}));

import { opportunityFeedTool } from "@/frameworks/mcp-tools/tools/opportunityFeedTool";
import { buildSupportResources } from "@/application/location/BuildSupportResources";

describe("opportunityFeedTool", () => {
  it("builds location-aware support resources with deterministic labels and urls", () => {
    const resources = buildSupportResources({ city: "Austin", state: "TX" });

    expect(resources).toHaveLength(4);
    expect(resources[0]?.label).toContain("TX");
    expect(resources[2]?.url).toContain(encodeURIComponent("Austin, TX"));
    expect(resources[3]?.category).toBe("community_support");
  });

  it("prefers zip-specific support scope when a postal code is available", () => {
    const resources = buildSupportResources({ city: "Austin", state: "TX", zipCode: "78701" });

    expect(resources[0]?.locationLabel).toBe("78701, TX");
    expect(resources[0]?.resolutionSource).toBe("zip_exact");
    expect(resources[0]?.fallbackScope).toBe("zip");
    expect(resources[2]?.url).toContain(encodeURIComponent("78701, TX"));
  });

  it("marks state-only support resources as fallback-scoped", () => {
    const resources = buildSupportResources({ state: "WA" });

    expect(resources[0]?.isFallback).toBe(true);
    expect(resources[0]?.fallbackScope).toBe("state");
    expect(resources[0]?.locationLabel).toBe("WA");
  });

  it("builds national starter resources when no location has been selected yet", () => {
    const resources = buildSupportResources({});

    expect(resources).toHaveLength(4);
    expect(resources[0]?.locationLabel).toBe("United States");
    expect(resources[0]?.resolutionSource).toBe("national_fallback");
    expect(resources[0]?.fallbackScope).toBe("national");
    expect(resources[2]?.isFallback).toBe(true);
  });

  it("aggregates jobs, housing, and resources in one response", async () => {
    const result = await opportunityFeedTool.execute({
      query: "entry level analyst",
      location: "Austin, TX",
      city: "Austin",
      state: "TX",
      radiusMiles: 20,
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.jobs.count).toBeGreaterThanOrEqual(1);
    expect(result.data.housing.count).toBeGreaterThanOrEqual(1);
    expect(result.data.housing.baseline.fmrMonthly).toBeGreaterThan(0);
    expect(result.data.resources.length).toBeGreaterThan(0);
    expect(result.data.resources[0]?.label).toContain("TX");
    expect(result.data.resources[0]?.url).toContain("hud.gov");
    expect(result.data.resources[2]?.url).toContain(encodeURIComponent("Austin, TX"));
  });

  it("returns a disclosed national benchmark fallback for unsupported markets", async () => {
    const result = await opportunityFeedTool.execute({
      query: "entry level analyst",
      location: "Boise, ID",
      city: "Boise",
      state: "ID",
      radiusMiles: 20,
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.housing.baseline.fmrMonthly).toBeGreaterThan(0);
    expect(result.data.housing.locationResolution?.resolutionKind).toBe("national_benchmark");
    expect(result.data.housing.locationResolution?.fallbackReason).toContain("Boise, ID");
  });
});
