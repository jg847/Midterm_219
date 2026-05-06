import { describe, expect, it } from "vitest";

import { housingMarketTool } from "@/frameworks/mcp-tools/tools/housingMarketTool";

describe("housingMarketTool", () => {
  it("returns exact location resolution for a seeded market", async () => {
    const result = await housingMarketTool.execute({ location: "Houston, TX", bedroomCount: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.locationResolution.usedFallback).toBe(false);
    expect(result.data.locationResolution.resolvedLabel).toBe("Houston, TX");
  });

  it("returns disclosed fallback resolution instead of silently using the first row", async () => {
    const result = await housingMarketTool.execute({ location: "Dallas, TX", bedroomCount: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.locationResolution.usedFallback).toBe(true);
    expect(result.data.locationResolution.fallbackReason).toContain("Dallas, TX");
    expect(result.data.locationResolution.resolvedLabel).toBe("Houston, TX");
  });

  it("returns a national benchmark for unsupported states", async () => {
    const result = await housingMarketTool.execute({ location: "Boise, ID", bedroomCount: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.baseline.fmrMonthly).toBeGreaterThan(0);
    expect(result.data.locationResolution.usedFallback).toBe(true);
    expect(result.data.locationResolution.resolutionKind).toBe("national_benchmark");
    expect(result.data.locationResolution.fallbackReason).toContain("Boise, ID");
  });
});