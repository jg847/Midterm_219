import type { ConversationRecord, ConversationRepository } from "@/application/ports/ConversationRepository";
import type {
  ModelClient,
  StreamTextPrompt,
  ModelToolDefinition,
  ToolUseModelPrompt,
  ToolUseModelResponse,
} from "@/application/ports/ModelClient";
import type { ToolCatalog } from "@/application/ports/ToolCatalog";
import type { TelemetryPort } from "@/application/ports/TelemetryPort";
import type { ToolExecutionResponse, ToolExecutor } from "@/application/ports/ToolExecutor";

export class InMemoryTestConversationRepository implements ConversationRepository {
  constructor(public value: ConversationRecord | null = null) {}

  async getSession(sessionId: string): Promise<ConversationRecord | null> {
    if (!this.value || this.value.sessionId !== sessionId) {
      return null;
    }

    return this.value;
  }

  async saveSession(record: ConversationRecord): Promise<void> {
    this.value = record;
  }

  async deleteSession(): Promise<void> {
    this.value = null;
  }
}

export class ScriptedToolUseModelClient implements ModelClient {
  public calls: ToolUseModelPrompt[] = [];
  public streamCalls: StreamTextPrompt[] = [];

  constructor(
    private readonly script: ToolUseModelResponse[],
    private readonly streamChunks: string[] = [],
  ) {}

  async generate(): Promise<string> {
    return "unused";
  }

  async generateToolUse(prompt: ToolUseModelPrompt): Promise<ToolUseModelResponse> {
    this.calls.push(prompt);
    const next = this.script.shift();
    if (!next) {
      return { type: "assistant_message", message: "No scripted response", stopReason: "end_turn" };
    }

    return next;
  }

  async *streamText(prompt: StreamTextPrompt, options?: { signal?: AbortSignal }): AsyncIterable<string> {
    this.streamCalls.push(prompt);

    for (const chunk of this.streamChunks) {
      if (options?.signal?.aborted) {
        const error = new Error("The streaming request was aborted.");
        error.name = "AbortError";
        throw error;
      }

      yield chunk;
    }
  }
}

export class RecordingTelemetry implements TelemetryPort {
  public events: Array<{ name: string; attributes: Record<string, string | number | boolean | null> }> = [];

  track(event: { name: string; attributes: Record<string, string | number | boolean | null> }): void {
    this.events.push(event);
  }
}

export class StaticToolCatalog implements ToolCatalog {
  constructor(private readonly tools: ModelToolDefinition[]) {}

  listTools(): ModelToolDefinition[] {
    return this.tools;
  }
}

export class DeterministicToolExecutor implements ToolExecutor {
  constructor(
    private readonly handlers: Record<
      string,
      (input: Record<string, unknown>) => Promise<ToolExecutionResponse> | ToolExecutionResponse
    >,
  ) {}

  async execute(toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResponse> {
    const handler = this.handlers[toolName];
    if (!handler) {
      return { ok: false, error: { code: "NOT_FOUND" } };
    }

    return await handler(input);
  }
}

export function buildAssistantMessageResponse(message: string): ToolUseModelResponse {
  return {
    type: "assistant_message",
    stopReason: "end_turn",
    message,
  };
}

export function buildToolCallResponse(
  toolUseId: string,
  toolName: string,
  input: Record<string, unknown>,
): ToolUseModelResponse {
  return {
    type: "tool_calls",
    stopReason: "tool_use",
    toolCalls: [{ id: toolUseId, toolName, input }],
  };
}

export function buildHousingMarketCatalog(): StaticToolCatalog {
  return new StaticToolCatalog([
    {
      name: "housing_market_tool",
      description: "Get housing market baseline for a location.",
      inputSchema: { type: "object", properties: { location: { type: "string" } } },
    },
  ]);
}

export function buildBudgetCatalog(): StaticToolCatalog {
  return new StaticToolCatalog([
    {
      name: "budget_plan_tool",
      description: "Evaluate a partial or complete budget profile for affordability.",
      inputSchema: { type: "object", properties: { profile: { type: "object" } } },
    },
  ]);
}

export function buildHousingMarketExecutor(): DeterministicToolExecutor {
  return new DeterministicToolExecutor({
    housing_market_tool: async (input) => ({
      ok: true,
      data: {
        baseline: {
          location: String(input.location ?? "Houston, TX"),
          bedroomCount: 1,
          fmrMonthly: 1280,
          hourlyWageNeededFor30Pct: 24.62,
        },
      },
    }),
  });
}

export function buildBudgetExecutor(): DeterministicToolExecutor {
  return new DeterministicToolExecutor({
    budget_plan_tool: async () => ({
      ok: true,
      data: {
        verdict: "warning",
        burdenPct: 36,
        monthlyNetPosition: 700,
        incomeBasisUsed: "gross",
        categoryBreakdown: {
          housing: 1800,
          utilities: 150,
          transportation: 300,
          food: 450,
        },
        missingFields: ["netMonthlyIncome"],
        assumptions: [
          {
            field: "grossMonthlyIncome",
            source: "user",
          },
        ],
        isPartial: true,
        usedFallbackRule: true,
        fallbackExplanation: "This estimate uses gross income because net monthly income was not provided.",
        guidance: ["Add net income for a more reliable verdict."],
        locationResolution: {
          resolvedLabel: "Austin, TX",
          resolutionKind: "exact",
          usedFallback: false,
        },
      },
    }),
  });
}