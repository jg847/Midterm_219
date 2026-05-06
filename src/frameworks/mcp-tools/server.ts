import { failure } from "@/shared/core/Result";

import { ToolRegistry } from "./registry";

export class MCPServer {
  constructor(private readonly registry: ToolRegistry) {}

  listTools(): string[] {
    return this.registry.list().map((tool) => tool.name);
  }

  async callTool(name: string, input: unknown): Promise<unknown> {
    const tool = this.registry.get(name);
    if (!tool) {
      return failure({
        code: "NOT_FOUND",
        message: `Tool '${name}' is not registered`,
        retryable: false,
      });
    }

    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) {
      return failure({
        code: "VALIDATION_ERROR",
        message: parsed.error.message,
        retryable: false,
      });
    }

    return tool.execute(parsed.data);
  }
}
