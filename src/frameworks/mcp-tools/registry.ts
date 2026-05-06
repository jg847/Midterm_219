import type { AnyToolDefinition, ToolDefinition } from "./types";

export class ToolRegistry {
  private readonly tools = new Map<string, AnyToolDefinition>();

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    this.tools.set(tool.name, tool as unknown as AnyToolDefinition);
  }

  get(name: string): AnyToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): AnyToolDefinition[] {
    return [...this.tools.values()];
  }
}
