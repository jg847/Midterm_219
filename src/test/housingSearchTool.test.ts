import { describe, expect, it, vi } from "vitest";

vi.mock("@/frameworks/providers/rentcast/rentcastClient", () => ({
  searchRentcast: vi.fn(async () => []),
}));

import { housingSearchTool } from "@/frameworks/mcp-tools/tools/housingSearchTool";

describe("housingSearchTool", () => {
  it("returns HUD fallback when no RentCast listings are available", async () => {
    const result = await housingSearchTool.execute({
      city: "Newark",
      state: "NJ",
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.listings).toHaveLength(0);
      expect(result.data.fallback).toBeDefined();
      expect(result.data.locationResolution?.resolvedLabel).toBe("Newark, NJ");
      expect(result.data.locationResolution?.usedFallback).toBe(false);
    }
  });

  it("returns a disclosed national benchmark for unsupported states when listings are unavailable", async () => {
    const result = await housingSearchTool.execute({
      city: "Boise",
      state: "ID",
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.listings).toHaveLength(0);
      expect(result.data.fallback).toBeDefined();
      expect(result.data.fallback?.location).toBe("National benchmark");
      expect(result.data.locationResolution?.resolutionKind).toBe("national_benchmark");
      expect(result.data.locationResolution?.fallbackReason).toContain("Boise, ID");
    }
  });
});
