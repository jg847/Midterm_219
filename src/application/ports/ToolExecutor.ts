export type ToolExecutionResponse = {
  ok?: boolean;
  error?: {
    code?: string;
  };
};

export interface ToolExecutor {
  execute(toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResponse>;
}
