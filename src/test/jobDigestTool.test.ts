import { describe, expect, it, vi } from "vitest";

vi.mock("@/frameworks/mcp-tools/tools/jobSearchTool", () => ({
  jobSearchTool: {
    execute: vi.fn(async () => ({
      ok: true,
      data: {
        listings: [],
      },
    })),
  },
}));

import { jobDigestTool } from "@/frameworks/mcp-tools/tools/jobDigestTool";

describe("jobDigestTool", () => {
  it("returns actionable fallback cards when no live jobs are found", async () => {
    const result = await jobDigestTool.execute({
      query: "Find entry-level jobs within 15 miles",
      location: "Newark, NJ",
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.summary).toBe("No live jobs matched this search.");
    expect(result.data.keyStats[0]?.value).toBe("0");
    expect(result.data.cards.length).toBeGreaterThan(0);
    expect(result.data.cards[0]?.actions.length).toBeGreaterThan(0);
    expect(result.data.cards[0]?.actions[0]?.url).toContain("k=entry+level");
    expect(result.data.warnings[0]).toContain("broader titles");
  });
});