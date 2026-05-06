export type ModelMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ModelToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ModelToolCall = {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
};

export type ModelPrompt = {
  system: string;
  messages: ModelMessage[];
};

export type ToolUseTextBlock = {
  type: "text";
  text: string;
};

export type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type ToolResultBlock = {
  type: "tool_result";
  toolUseId: string;
  toolName: string;
  content: string;
  isError?: boolean;
};

export type ToolUseModelMessage = {
  role: "user" | "assistant";
  content: Array<ToolUseTextBlock | ToolUseBlock | ToolResultBlock>;
};

export type ToolUseModelPrompt = {
  system: string;
  messages: ToolUseModelMessage[];
  tools: ModelToolDefinition[];
  maxTokens?: number;
};

export type StreamTextPrompt = {
  system: string;
  messages: ModelMessage[];
  maxTokens?: number;
};

export type ToolUseModelResponse =
  | {
      type: "assistant_message";
      message: string;
      stopReason: "end_turn" | "stop_sequence" | "max_tokens";
    }
  | {
      type: "tool_calls";
      toolCalls: ModelToolCall[];
      stopReason: "tool_use";
      assistantMessage?: string;
    };

export interface ModelClient {
  generate(prompt: ModelPrompt, options?: { signal?: AbortSignal }): Promise<string>;
  generateToolUse?(prompt: ToolUseModelPrompt, options?: { signal?: AbortSignal }): Promise<ToolUseModelResponse>;
  streamText?(prompt: StreamTextPrompt, options?: { signal?: AbortSignal }): AsyncIterable<string>;
}
