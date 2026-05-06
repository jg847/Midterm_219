import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/frameworks/mcp-tools/tools/listingActionLinksTool", () => ({
  listingActionLinksTool: {
    execute: vi.fn(async () => ({
      ok: true,
      data: {
        primaryLabel: "Open listing",
        primaryUrl: "https://example.com/listing",
        alternates: [],
      },
    })),
  },
}));

import { housingDigestTool } from "@/frameworks/mcp-tools/tools/housingDigestTool";

describe("housingDigestTool", () => {
  it("uses a housing benchmark even when live listings are present", async () => {
    const result = await housingDigestTool.execute({
      query: "apartments under $1700",
      location: "Austin, TX",
      city: "Austin",
      state: "TX",
      radiusMiles: 15,
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.keyStats.find((item) => item.label === "Housing Benchmark")?.value).not.toBe("$0");
    expect(result.data.cards[0]?.details[1]).toContain("Benchmark");
    expect(result.data.locationResolution?.resolvedLabel).toBe("Houston, TX");
  });
});