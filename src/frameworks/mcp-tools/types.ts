import type { z } from "zod";

import type { ToolResult } from "@/domain/models/ToolTypes";

export type ToolDefinition<TInput, TOutput> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<ToolResult<TOutput>>;
};

export type AnyToolDefinition = ToolDefinition<unknown, unknown>;
