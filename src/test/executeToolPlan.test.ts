import { describe, expect, it, vi } from "vitest";

import { executeToolPlan } from "@/application/chat/ExecuteToolPlan";

describe("executeToolPlan", () => {
  it("uses neutral national defaults when no location has been grounded", async () => {
    const execute = vi.fn(async () => ({ ok: true, data: {} }));

    await executeToolPlan({ execute }, ["opportunity_feed_tool", "job_search_tool"], "find work and rent options");

    expect(execute).toHaveBeenNthCalledWith(
      1,
      "opportunity_feed_tool",
      expect.objectContaining({
        location: "National, US",
        city: "National",
        state: "US",
      }),
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      "job_search_tool",
      expect.objectContaining({
        location: "National, US",
      }),
    );
  });
});