import { MCPServer } from "./server";
import { MCPToolCatalogAdapter } from "./ToolCatalogAdapter";
import { ToolRegistry } from "./registry";
import { datasetQueryTool } from "./tools/datasetQueryTool";
import { housingMarketTool } from "./tools/housingMarketTool";
import { housingSearchTool } from "./tools/housingSearchTool";
import { jobSearchTool } from "./tools/jobSearchTool";
import { jobDigestTool } from "./tools/jobDigestTool";
import { locationLookupTool } from "./tools/locationLookupTool";
import { listingActionLinksTool } from "./tools/listingActionLinksTool";
import { ragRetrievalTool } from "./tools/ragRetrievalTool";
import { storyInformationTool } from "./tools/storyInformationTool";
import { opportunityFeedTool } from "./tools/opportunityFeedTool";
import { uiDigestTool } from "./tools/uiDigestTool";
import { housingDigestTool } from "./tools/housingDigestTool";
import { budgetPlanTool } from "./tools/budgetPlanTool";
import { isBudgetCapabilityEnabled } from "@/shared/config/chatRuntime";

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  const budgetCapabilityEnabled = isBudgetCapabilityEnabled();

  registry.register(locationLookupTool);
  registry.register(listingActionLinksTool);
  registry.register(jobSearchTool);
  registry.register(jobDigestTool);
  registry.register(housingSearchTool);
  registry.register(housingMarketTool);
  registry.register(housingDigestTool);
  registry.register(datasetQueryTool);
  registry.register(storyInformationTool);
  registry.register(ragRetrievalTool);
  registry.register(opportunityFeedTool);
  registry.register(uiDigestTool);
  if (budgetCapabilityEnabled) {
    registry.register(budgetPlanTool);
  }

  return registry;
}

export function createMcpServer(registry: ToolRegistry = createToolRegistry()): MCPServer {
  return new MCPServer(registry);
}

export function createToolCatalogAdapter(
  registry: ToolRegistry = createToolRegistry(),
): MCPToolCatalogAdapter {
  return new MCPToolCatalogAdapter(registry);
}
