import { describe, expect, it, vi } from "vitest";

vi.mock("@/frameworks/providers/jobs/usajobsClient", () => ({
  searchUsaJobs: vi.fn(async () => {
    throw new Error("USAJOBS outage");
  }),
}));

vi.mock("@/frameworks/providers/jobs/adzunaClient", () => ({
  searchAdzuna: vi.fn(async () => []),
}));

import { jobSearchTool } from "@/frameworks/mcp-tools/tools/jobSearchTool";

describe("jobSearchTool", () => {
  it("returns typed upstream error on provider failure", async () => {
    const result = await jobSearchTool.execute({
      query: "analyst",
      location: "Newark, NJ",
      limit: 5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UPSTREAM_ERROR");
      expect(result.error.retryable).toBe(true);
    }
  });
});
