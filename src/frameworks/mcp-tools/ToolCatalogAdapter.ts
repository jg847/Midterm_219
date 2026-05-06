import { z } from "zod";

import type { ToolCatalog } from "@/application/ports/ToolCatalog";
import type { ModelToolDefinition } from "@/application/ports/ModelClient";

import type { ToolRegistry } from "./registry";

export class MCPToolCatalogAdapter implements ToolCatalog {
  constructor(private readonly registry: ToolRegistry) {}

  listTools(): ModelToolDefinition[] {
    return this.registry.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: z.toJSONSchema(tool.inputSchema),
    }));
  }
}