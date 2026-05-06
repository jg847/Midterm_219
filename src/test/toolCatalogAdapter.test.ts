import { afterEach, describe, expect, it, vi } from "vitest";

import { createToolCatalogAdapter, createToolRegistry } from "@/frameworks/mcp-tools";

describe("MCPToolCatalogAdapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes registered tools as model-facing definitions with JSON schema", () => {
    const registry = createToolRegistry();
    const catalog = createToolCatalogAdapter(registry);

    const tools = catalog.listTools();
    const locationTool = tools.find((tool) => tool.name === "location_lookup_tool");

    expect(tools.length).toBeGreaterThan(0);
    expect(locationTool).toBeDefined();
    expect(locationTool?.description.length).toBeGreaterThan(10);
    expect(locationTool?.inputSchema.type).toBe("object");
    expect(locationTool?.inputSchema.properties).toHaveProperty("query");
  });

  it("exposes provider limits and fallback disclosure in native-tool-use descriptions", () => {
    const catalog = createToolCatalogAdapter(createToolRegistry());
    const tools = catalog.listTools();

    const housingSearchTool = tools.find((tool) => tool.name === "housing_search_tool");
    const housingMarketTool = tools.find((tool) => tool.name === "housing_market_tool");
    const opportunityFeedTool = tools.find((tool) => tool.name === "opportunity_feed_tool");

    expect(housingSearchTool?.description).toContain("does not support radius filtering");
    expect(housingSearchTool?.description).toContain("locationResolution");
    expect(housingMarketTool?.description).toContain("disclosed");
    expect(opportunityFeedTool?.description).toContain("locationResolution");
  });

  it("omits the budget tool when the budget capability flag is off", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_BUDGET_CAPABILITY", "false");

    const catalog = createToolCatalogAdapter(createToolRegistry());
    const tools = catalog.listTools();

    expect(tools.some((tool) => tool.name === "budget_plan_tool")).toBe(false);
  });
});