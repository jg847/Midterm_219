import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("duplication guard", () => {
  it("keeps housing burden wage formula centralized", () => {
    const files = [
      path.join(process.cwd(), "src/frameworks/mcp-tools/tools/housingSearchTool.ts"),
      path.join(process.cwd(), "src/frameworks/mcp-tools/tools/housingMarketTool.ts"),
      path.join(process.cwd(), "src/frameworks/mcp-tools/tools/opportunityFeedTool.ts"),
    ];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(content.includes("hourlyWageNeededForHousingBurden(")).toBe(true);
      expect(content.includes("(52 * 40)")).toBe(false);
      expect(content.includes("/ 0.3")).toBe(false);
    }
  });

  it("keeps location normalization centralized in location service", () => {
    const routeFile = path.join(process.cwd(), "src/app/api/location/resolve/route.ts");
    const routeContent = readFileSync(routeFile, "utf8");

    expect(routeContent.includes("normalizeLocationContext(")).toBe(true);
    expect(routeContent.includes("formatted: input.formatted ??")).toBe(false);
  });
});
