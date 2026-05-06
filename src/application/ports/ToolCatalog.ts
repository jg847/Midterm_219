import type { ModelToolDefinition } from "./ModelClient";

export interface ToolCatalog {
  listTools(): ModelToolDefinition[];
}