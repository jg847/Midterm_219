import { describe, expect, it } from "vitest";

import { classifyIntent } from "@/application/chat/ClassifyIntent";
import { selectTools } from "@/application/chat/SelectTools";

describe("chat intent policy", () => {
  it("maps affordability comparison questions to the affordability tool path", () => {
    const intent = classifyIntent("Compare job pay vs rent burden in this location");
    const tools = selectTools(intent);

    expect(intent).toBe("affordability");
    expect(tools).toContain("ui_digest_tool");
    expect(tools).toContain("opportunity_feed_tool");
    expect(tools).toContain("housing_market_tool");
  });

  it("maps job questions to jobs intent and tools", () => {
    const intent = classifyIntent("Find software jobs in Newark");
    expect(intent).toBe("jobs");
    expect(selectTools(intent)).toContain("job_search_tool");
    expect(selectTools(intent)).toContain("job_digest_tool");
  });

  it("maps housing questions to housing tools", () => {
    const intent = classifyIntent("find apartments under 1800");
    const tools = selectTools(intent);
    expect(intent).toBe("housing");
    expect(tools).toContain("housing_search_tool");
    expect(tools).toContain("housing_market_tool");
  });
});
