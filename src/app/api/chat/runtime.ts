import type { ModelClient } from "@/application/ports/ModelClient";
import type { ToolExecutionResponse } from "@/application/ports/ToolExecutor";
import type { ToolCatalog } from "@/application/ports/ToolCatalog";
import type { TelemetryPort } from "@/application/ports/TelemetryPort";
import { AnthropicModelClient } from "@/frameworks/ai/AnthropicModelClient";
import { DeterministicNativeToolUseModelClient } from "@/frameworks/ai/DeterministicNativeToolUseModelClient";
import { createMcpServer, createToolCatalogAdapter, createToolRegistry } from "@/frameworks/mcp-tools";
import { createConversationRepository } from "@/frameworks/repositories/conversation/createConversationRepository";
import { createTelemetry } from "@/frameworks/telemetry/createTelemetry";
import { isBudgetCapabilityEnabled } from "@/shared/config/chatRuntime";

type ChatRuntime = {
  budgetCapabilityEnabled: boolean;
  conversationRepository: ReturnType<typeof createConversationRepository>;
  modelClient: ModelClient;
  telemetry: TelemetryPort;
  toolCatalog: ToolCatalog;
  toolExecutor: {
    execute(toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResponse>;
  };
};

let runtime: ChatRuntime | null = null;
let conversationRepository: ReturnType<typeof createConversationRepository> | null = null;

export function getConversationRepository(): ReturnType<typeof createConversationRepository> {
  if (!conversationRepository) {
    conversationRepository = createConversationRepository();
  }

  return conversationRepository;
}

function createModelClient(): ModelClient {
  if (process.env.E2E_NATIVE_TOOL_USE_MODEL === "scripted") {
    return new DeterministicNativeToolUseModelClient();
  }

  return new AnthropicModelClient();
}

export function getChatRuntime(): ChatRuntime {
  const budgetCapabilityEnabled = isBudgetCapabilityEnabled();

  if (runtime && runtime.budgetCapabilityEnabled === budgetCapabilityEnabled) {
    return runtime;
  }

  const registry = createToolRegistry();
  const mcpServer = createMcpServer(registry);

  runtime = {
    budgetCapabilityEnabled,
    conversationRepository: getConversationRepository(),
    modelClient: createModelClient(),
    telemetry: createTelemetry(),
    toolCatalog: createToolCatalogAdapter(registry),
    toolExecutor: {
      async execute(toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResponse> {
        const result = await mcpServer.callTool(toolName, input);
        return result as ToolExecutionResponse;
      },
    },
  };

  return runtime;
}