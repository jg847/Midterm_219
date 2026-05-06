import { describe, expect, it } from "vitest";

import { datasetQueryTool } from "@/frameworks/mcp-tools/tools/datasetQueryTool";

describe("datasetQueryTool", () => {
  it("returns living wage metric", async () => {
    const result = await datasetQueryTool.execute({ metric: "livingWage" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data.value).toBe("number");
      expect(result.data.location).toBe("Reference affordability benchmark");
      expect(result.data.sourceLabel).toContain("Newark");
      expect(result.data.disclosure).toContain("reference seed");
    }
  });
});
