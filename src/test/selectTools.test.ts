import { describe, expect, it } from "vitest";

import { selectTools } from "@/application/chat/SelectTools";

describe("selectTools", () => {
  it("uses digest and market tools for affordability comparisons", () => {
    const tools = selectTools("affordability");

    expect(tools).toContain("ui_digest_tool");
    expect(tools).toContain("opportunity_feed_tool");
    expect(tools).toContain("housing_market_tool");
  });

  it("includes both housing search and market fallback tools", () => {
    const tools = selectTools("housing");
    expect(tools).toContain("housing_digest_tool");
    expect(tools).toContain("housing_search_tool");
    expect(tools).toContain("housing_market_tool");
  });
});
