import type { ConversationRepository } from "@/application/ports/ConversationRepository";
import type { ModelClient, ModelMessage, ToolUseModelMessage } from "@/application/ports/ModelClient";
import type { ToolCatalog } from "@/application/ports/ToolCatalog";
import type { TelemetryPort } from "@/application/ports/TelemetryPort";
import type { ToolExecutor } from "@/application/ports/ToolExecutor";
import type { BudgetProfile, PersistedBudgetState } from "@/domain/models/BudgetProfile";
import type { ResolvedLocationContext } from "@/domain/models/LocationContext";
import {
  BudgetPlanToolInputSchema,
  type BudgetPlanToolInput,
  type BudgetPlanToolOutput,
} from "@/shared/schemas/budget";
import { getConversationExpiryIso } from "@/shared/config/sessionMemory";

import { formatBudgetStateForPrompt, mergePersistedBudgetState } from "./BudgetState";
import { classifyIntent } from "./ClassifyIntent";
import {
  buildClarificationQuestion,
  buildFallbackLocation,
  buildResolvedLocationFromInput,
  getClarificationState,
  normalizeLocationResolution,
} from "./LocationGrounding";
import type { ToolUseChatEvent } from "./ToolUseChatEvents";
import type { ChatRequest, ChatResponsePayload } from "./types";

const MAX_TOOL_ROUNDS = 4;
const SYSTEM_PROMPT_BASE = [
  "You are Grounded Moves, a location-aware U.S. housing, jobs, and affordability assistant.",
  "Use the provided tools when grounded evidence is needed.",
  "Do not invent listings, wages, rents, or provider results.",
  "Cite the tool names that support your claims.",
  "If location context is missing or ambiguous, ask for clarification unless the conversation state allows a disclosed fallback.",
].join(" ");

const SYSTEM_PROMPT_BUDGET_ENABLED = [
  "For budgeting, gather only the next useful missing fact, reuse persisted budget facts when they already exist, and use budget_plan_tool for structured affordability analysis.",
  "Budget comparisons from housing or jobs tools are transient analysis targets unless the user explicitly confirms them as their own facts.",
  "Do not present budgeting as financial advice, underwriting, or guaranteed approval guidance.",
].join(" ");

const SYSTEM_PROMPT_BUDGET_DISABLED = [
  "The dedicated budgeting capability is currently disabled.",
  "If the user asks for a budget verdict, say that structured budgeting is temporarily unavailable and continue with non-budget grounded housing, jobs, or location guidance only.",
].join(" ");

function buildSystemPrompt(hasBudgetCapability: boolean): string {
  return [
    SYSTEM_PROMPT_BASE,
    hasBudgetCapability ? SYSTEM_PROMPT_BUDGET_ENABLED : SYSTEM_PROMPT_BUDGET_DISABLED,
  ].join(" ");
}

function getBudgetProfileFacts(profile: BudgetProfile): Partial<Record<keyof BudgetProfile, string | number>> {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<Record<keyof BudgetProfile, string | number>>;
}

function emitBudgetLifecycleTelemetry(args: {
  telemetry: TelemetryPort;
  sessionId: string;
  previousBudgetState?: PersistedBudgetState;
  toolInput: BudgetPlanToolInput;
  toolOutput?: BudgetPlanToolOutput;
  errorCode?: string;
}): void {
  const { telemetry, sessionId, previousBudgetState, toolInput, toolOutput, errorCode } = args;
  const incomingFacts = getBudgetProfileFacts(toolInput.profile);
  const previousFacts = getBudgetProfileFacts(previousBudgetState?.profile ?? {});
  const updatedFields = Object.keys(incomingFacts).filter(
    (field) => previousFacts[field as keyof BudgetProfile] === undefined,
  );
  const correctedFields = Object.keys(incomingFacts).filter((field) => {
    const previousValue = previousFacts[field as keyof BudgetProfile];
    const nextValue = incomingFacts[field as keyof BudgetProfile];
    return previousValue !== undefined && previousValue !== nextValue;
  });

  if (!previousBudgetState) {
    telemetry.track({
      name: "chat.budget_state.started",
      attributes: {
        sessionId,
        factCount: Object.keys(incomingFacts).length,
      },
    });
  }

  if (updatedFields.length > 0) {
    telemetry.track({
      name: "chat.budget_fact.updated",
      attributes: {
        sessionId,
        fieldCount: updatedFields.length,
        fields: updatedFields.join(","),
      },
    });
  }

  if (correctedFields.length > 0) {
    telemetry.track({
      name: "chat.budget_fact.corrected",
      attributes: {
        sessionId,
        fieldCount: correctedFields.length,
        fields: correctedFields.join(","),
      },
    });
  }

  if (toolInput.compareAgainst && Object.keys(toolInput.compareAgainst).length > 0) {
    telemetry.track({
      name: "chat.budget_comparison_target.adopted",
      attributes: {
        sessionId,
        fieldCount: Object.keys(toolInput.compareAgainst).length,
        source: toolInput.compareAgainst.source ?? "unknown",
      },
    });
  }

  if (errorCode) {
    telemetry.track({
      name: "chat.budget.validation_failed",
      attributes: {
        sessionId,
        errorCode,
      },
    });
    return;
  }

  telemetry.track({
    name: "chat.budget.tool_executed",
    attributes: {
      sessionId,
      isPartial: toolOutput?.isPartial ?? false,
    },
  });

  if (toolOutput?.usedFallbackRule) {
    telemetry.track({
      name: "chat.budget.degraded_fallback_used",
      attributes: {
        sessionId,
        missingFieldCount: toolOutput.missingFields.length,
      },
    });
  }

  if (toolOutput?.verdict) {
    telemetry.track({
      name: "chat.budget.verdict_generated",
      attributes: {
        sessionId,
        verdict: toolOutput.verdict,
        isPartial: toolOutput.isPartial,
      },
    });
  }
}

function buildAssistantArtifacts(payload: ChatResponsePayload) {
  return [
    ...(payload.citations.length > 0
      ? [{ type: "citation_list" as const, citations: payload.citations }]
      : []),
    ...(payload.toolResults.length > 0
      ? [
          {
            type: "trace_summary" as const,
            summary: payload.toolResults
              .map((result) => `${result.toolName}: ${result.ok ? "ok" : `error(${result.errorCode ?? "unknown"})`}`)
              .join("; "),
          },
          ...payload.toolResults.map((result) => ({
            type: "tool_result" as const,
            toolName: result.toolName,
            payload: result.payload,
            ok: result.ok,
            latencyMs: result.latencyMs,
            errorCode: result.errorCode,
          })),
        ]
      : []),
  ];
}

function stringifyToolPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return "{\"error\":\"non_serializable_payload\"}";
  }
}

function withConversationContext(
  message: string,
  resolvedLocation?: ResolvedLocationContext,
  budgetState?: PersistedBudgetState,
): string {
  const sections = [message];

  if (resolvedLocation) {
    sections.push(`Resolved location context: ${JSON.stringify({
    formatted: resolvedLocation.formatted,
    city: resolvedLocation.city,
    state: resolvedLocation.state,
    resolutionKind: resolvedLocation.resolutionKind,
    usedFallback: resolvedLocation.usedFallback,
    fallbackReason: resolvedLocation.fallbackReason,
  })}`);
  }

  const budgetStateSummary = formatBudgetStateForPrompt(budgetState);
  if (budgetStateSummary) {
    sections.push(`Persisted budget state: ${budgetStateSummary}`);
  }

  return sections.join("\n\n");
}

function emitToolUseEventTelemetry(
  telemetry: TelemetryPort,
  sessionId: string,
  event: ToolUseChatEvent,
): void {
  switch (event.type) {
    case "assistant_message":
      telemetry.track({
        name: "chat.assistant.message_generated",
        attributes: {
          sessionId,
          textLength: event.text.length,
        },
      });
      return;
    case "assistant_delta":
      telemetry.track({
        name: "chat.stream.assistant_delta_generated",
        attributes: {
          sessionId,
          deltaLength: event.delta.length,
        },
      });
      return;
    case "tool_request":
      telemetry.track({
        name: "chat.tool.requested",
        attributes: {
          sessionId,
          toolName: event.toolName,
          toolUseId: event.toolUseId,
        },
      });
      return;
    case "tool_result":
      telemetry.track({
        name: "chat.tool.result_received",
        attributes: {
          sessionId,
          toolName: event.toolName,
          toolUseId: event.toolUseId,
          ok: event.ok,
          errorCode: event.errorCode ?? null,
          usedFallback: event.locationResolution?.usedFallback ?? false,
        },
      });
      return;
    case "clarification_prompt":
      telemetry.track({
        name: "chat.location.clarification_prompted",
        attributes: {
          sessionId,
          state: event.clarificationState.state,
          disclosedFallbackPermitted: event.clarificationState.disclosedFallbackPermitted,
        },
      });
      return;
    case "final_answer_completed":
      telemetry.track({
        name: "chat.final_answer.completed",
        attributes: {
          sessionId,
          textLength: event.text.length,
          citationCount: event.citations.length,
        },
      });
      return;
    case "stream_started":
      telemetry.track({
        name: "chat.stream.started",
        attributes: {
          sessionId,
          mode: event.mode,
        },
      });
      return;
    case "stream_error":
      telemetry.track({
        name: "chat.stream.error",
        attributes: {
          sessionId,
          retryable: event.retryable,
          code: event.code ?? null,
        },
      });
      return;
    case "stream_completed":
      telemetry.track({
        name: "chat.stream.completed",
        attributes: {
          sessionId,
          persisted: event.persisted,
        },
      });
      return;
  }
}

function emitLocationCoverageTelemetry(args: {
  telemetry: TelemetryPort;
  sessionId: string;
  toolName: string;
  payload: unknown;
  locationResolution?: ChatResponsePayload["toolResults"][number]["locationResolution"];
}): void {
  const { telemetry, sessionId, toolName, payload, locationResolution } = args;
  const asResult = payload as {
    ok?: boolean;
    data?: {
      resources?: Array<{ category?: string; isFallback?: boolean; fallbackScope?: string }>;
    };
  };

  const resources = Array.isArray(asResult.data?.resources) ? asResult.data.resources : [];
  const exactResources = resources.filter((resource) => resource?.isFallback === false);
  const fallbackResources = resources.filter((resource) => resource?.isFallback === true);

  if (exactResources.length > 0) {
    telemetry.track({
      name: "chat.resource_match.exact",
      attributes: {
        sessionId,
        toolName,
        resourceCount: exactResources.length,
        categoryCount: new Set(exactResources.map((resource) => resource?.category ?? "unknown")).size,
      },
    });
  }

  if (fallbackResources.length > 0) {
    telemetry.track({
      name: "chat.resource_match.fallback_used",
      attributes: {
        sessionId,
        toolName,
        resourceCount: fallbackResources.length,
        nationalCount: fallbackResources.filter((resource) => resource?.fallbackScope === "national").length,
        stateCount: fallbackResources.filter((resource) => resource?.fallbackScope === "state").length,
      },
    });
  }

  if (toolName === "opportunity_feed_tool" && resources.length === 0) {
    telemetry.track({
      name: "chat.resource_generation.degraded",
      attributes: {
        sessionId,
        toolName,
      },
    });
  }

  if (locationResolution?.usedFallback) {
    telemetry.track({
      name: "chat.benchmark.selected",
      attributes: {
        sessionId,
        toolName,
        resolutionKind: locationResolution.resolutionKind,
      },
    });
  }

  if (locationResolution?.resolutionKind === "national_benchmark") {
    telemetry.track({
      name: "chat.location.unsupported_market_surfaced",
      attributes: {
        sessionId,
        toolName,
      },
    });
  }
}

function chunkAssistantText(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const words = normalized.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 48 && current) {
      chunks.push(`${current} `);
      current = word;
      continue;
    }

    current = next;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function createAbortError(): Error {
  const error = new Error("The streaming request was aborted.");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function buildStreamingCompositionMessages(
  input: ChatRequest,
  existingMessages: ToolUseModelMessage[],
  resolvedLocation: ResolvedLocationContext | undefined,
  budgetState: PersistedBudgetState | undefined,
  toolResults: ChatResponsePayload["toolResults"],
): ModelMessage[] {
  const historyMessages: ModelMessage[] = existingMessages.map((message) => ({
    role: message.role,
    content: message.content
      .map((block) => {
        if (block.type === "text") {
          return block.text;
        }

        if (block.type === "tool_use") {
          return `Tool request: ${block.name} ${JSON.stringify(block.input)}`;
        }

        return `Tool result from ${block.toolName}: ${block.content}`;
      })
      .join("\n")
      .trim(),
  }));

  const evidence = toolResults.length === 0
    ? "No tool results were needed for this answer."
    : toolResults
        .map((result) => {
          const locationNote = result.locationResolution?.resolvedLabel
            ? ` Location: ${result.locationResolution.resolvedLabel}.`
            : "";
          return `Tool ${result.toolName} (${result.ok ? "ok" : `error:${result.errorCode ?? "unknown"}`}): ${stringifyToolPayload(result.payload)}${locationNote}`;
        })
        .join("\n\n");

  return [
    ...historyMessages,
    {
      role: "assistant",
      content: `Grounded evidence gathered for the current turn:\n${evidence}`,
    },
    {
      role: "user",
      content: [
        `Compose the final answer for: ${withConversationContext(input.message, resolvedLocation, budgetState)}`,
        "Use the grounded evidence above.",
        "Cite tool names explicitly when they support a claim.",
        "Do not invent provider results.",
      ].join("\n"),
    },
  ];
}

async function* streamFinalAnswer(
  deps: { modelClient: ModelClient; telemetry: TelemetryPort },
  input: ChatRequest,
  systemPrompt: string,
  messages: ToolUseModelMessage[],
  resolvedLocation: ResolvedLocationContext | undefined,
  budgetState: PersistedBudgetState | undefined,
  toolResults: ChatResponsePayload["toolResults"],
  fallbackAnswer: string,
  signal?: AbortSignal,
): AsyncGenerator<ToolUseChatEvent, string, void> {
  if (!deps.modelClient.streamText) {
    yield { type: "assistant_delta", delta: fallbackAnswer };
    return fallbackAnswer;
  }

  const streamedMessages = buildStreamingCompositionMessages(input, messages, resolvedLocation, budgetState, toolResults);
  let finalAnswer = "";

  for await (const delta of deps.modelClient.streamText(
    {
      system: systemPrompt,
      messages: streamedMessages,
    },
    { signal },
  )) {
    throwIfAborted(signal);
    finalAnswer += delta;
    const deltaEvent: ToolUseChatEvent = { type: "assistant_delta", delta };
    emitToolUseEventTelemetry(deps.telemetry, input.sessionId, deltaEvent);
    yield deltaEvent;
  }

  return finalAnswer.trim() || fallbackAnswer;
}

async function persistAssistantTurn(
  deps: {
    conversationRepository: ConversationRepository;
    sessionMemoryEnabled?: boolean;
  },
  existing: Awaited<ReturnType<ConversationRepository["getSession"]>>,
  input: ChatRequest,
  payload: ChatResponsePayload,
  clarificationState: ChatResponsePayload["clarificationState"],
  budgetState: PersistedBudgetState | undefined,
  now: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const sessionMemoryEnabled = deps.sessionMemoryEnabled ?? true;
  if (!sessionMemoryEnabled) {
    return false;
  }

  throwIfAborted(signal);

  await deps.conversationRepository.saveSession({
    sessionId: input.sessionId,
    messages: [
      ...(existing?.messages ?? []),
      { role: "user", content: input.message, createdAt: now },
      {
        role: "assistant",
        content: payload.answer,
        createdAt: now,
        artifacts: buildAssistantArtifacts(payload),
      },
    ],
    traces: [
      ...(existing?.traces ?? []),
      ...payload.toolResults.map((result) => ({
        toolName: result.toolName,
        latencyMs: result.latencyMs,
        ok: result.ok,
        errorCode: result.errorCode,
      })),
    ],
    clarificationState,
    budgetState,
    lastActivityAt: now,
    expiresAt: getConversationExpiryIso(new Date(now)),
  });

  return true;
}

export async function* streamChatQuestionWithNativeToolUse(
  input: ChatRequest,
  deps: {
    conversationRepository: ConversationRepository;
    modelClient: ModelClient;
    toolCatalog: ToolCatalog;
    telemetry: TelemetryPort;
    toolExecutor: ToolExecutor;
    sessionMemoryEnabled?: boolean;
    abortSignal?: AbortSignal;
    enableAnswerStreaming?: boolean;
  },
): AsyncGenerator<ToolUseChatEvent, ChatResponsePayload, void> {
  const streamStarted: ToolUseChatEvent = {
    type: "stream_started",
    sessionId: input.sessionId,
    mode: "native_tool_use",
  };
  emitToolUseEventTelemetry(deps.telemetry, input.sessionId, streamStarted);
  yield streamStarted;

  if (!deps.modelClient.generateToolUse) {
    const unsupportedPayload: ChatResponsePayload = {
      sessionId: input.sessionId,
      answer: "Native tool use is enabled, but the configured model client does not support it yet.",
      intent: classifyIntent(input.message),
      toolResults: [],
      citations: [],
    };

    for (const chunk of chunkAssistantText(unsupportedPayload.answer)) {
      const deltaEvent: ToolUseChatEvent = { type: "assistant_delta", delta: chunk };
      emitToolUseEventTelemetry(deps.telemetry, input.sessionId, deltaEvent);
      yield deltaEvent;
    }

    const finalEvent: ToolUseChatEvent = {
      type: "final_answer_completed",
      text: unsupportedPayload.answer,
      citations: [],
      payload: unsupportedPayload,
    };
    emitToolUseEventTelemetry(deps.telemetry, input.sessionId, finalEvent);
    yield finalEvent;

    const completedEvent: ToolUseChatEvent = { type: "stream_completed", persisted: false };
    emitToolUseEventTelemetry(deps.telemetry, input.sessionId, completedEvent);
    yield completedEvent;
    return unsupportedPayload;
  }

  const sessionMemoryEnabled = deps.sessionMemoryEnabled ?? true;
  const abortSignal = deps.abortSignal;
  throwIfAborted(abortSignal);
  const existing = sessionMemoryEnabled
    ? await deps.conversationRepository.getSession(input.sessionId)
    : null;
  const intent = classifyIntent(input.message);
  const now = new Date().toISOString();

  let clarificationState = input.location
    ? undefined
    : getClarificationState(input.message, existing?.clarificationState);
  let resolvedLocation = input.location ? buildResolvedLocationFromInput(input.location) : undefined;
  let budgetState = existing?.budgetState;
  clarificationState = clarificationState ?? undefined;

  if (clarificationState && !clarificationState.disclosedFallbackPermitted) {
    const clarificationQuestion = buildClarificationQuestion(clarificationState);
    const response: ChatResponsePayload = {
      sessionId: input.sessionId,
      answer: clarificationQuestion,
      intent,
      toolResults: [],
      citations: [],
      clarificationQuestion,
      clarificationState,
    };

    const promptEvent: ToolUseChatEvent = {
      type: "clarification_prompt",
      question: clarificationQuestion,
      clarificationState,
    };
    emitToolUseEventTelemetry(deps.telemetry, input.sessionId, promptEvent);
    yield promptEvent;

    const persisted = await persistAssistantTurn(
      deps,
      existing,
      input,
      response,
      clarificationState,
      budgetState,
      now,
      abortSignal,
    );

    const finalEvent: ToolUseChatEvent = {
      type: "final_answer_completed",
      text: clarificationQuestion,
      citations: [],
      payload: response,
    };
    emitToolUseEventTelemetry(deps.telemetry, input.sessionId, finalEvent);
    yield finalEvent;

    deps.telemetry.track({
      name: "chat.location.clarification_asked",
      attributes: { sessionId: input.sessionId, state: clarificationState.state },
    });

    const completedEvent: ToolUseChatEvent = { type: "stream_completed", persisted };
    emitToolUseEventTelemetry(deps.telemetry, input.sessionId, completedEvent);
    yield completedEvent;
    return response;
  }

  if (!resolvedLocation && clarificationState?.disclosedFallbackPermitted) {
    resolvedLocation = buildFallbackLocation(clarificationState);
    deps.telemetry.track({
      name: "chat.location.disclosed_fallback_used",
      attributes: { sessionId: input.sessionId, state: clarificationState.state, metro: clarificationState.fallbackMetro },
    });
  }

  const tools = deps.toolCatalog.listTools();
  const hasBudgetCapability = tools.some((tool) => tool.name === "budget_plan_tool");
  const systemPrompt = buildSystemPrompt(hasBudgetCapability);
  const promptBudgetState = hasBudgetCapability ? budgetState : undefined;
  const messages: ToolUseModelMessage[] = [
    ...(existing?.messages ?? [])
      .filter(
        (message): message is typeof message & { role: "user" | "assistant" } =>
          message.role === "user" || message.role === "assistant",
      )
      .map((message) => ({
        role: message.role,
        content: [{ type: "text" as const, text: message.content }],
      })),
    {
      role: "user" as const,
      content: [{ type: "text" as const, text: withConversationContext(input.message, resolvedLocation, promptBudgetState) }],
    },
  ];

  const toolResults: ChatResponsePayload["toolResults"] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    throwIfAborted(abortSignal);
    const modelResponse = await deps.modelClient.generateToolUse({
      system: systemPrompt,
      messages,
      tools,
    }, { signal: abortSignal });
    throwIfAborted(abortSignal);

    if (modelResponse.type === "assistant_message") {
      let finalMessage = modelResponse.message.trim();
      if (deps.enableAnswerStreaming !== false) {
        let streamedAnswer = modelResponse.message;
        for await (const streamedEvent of streamFinalAnswer(
          deps,
          input,
          systemPrompt,
          messages,
          resolvedLocation,
          promptBudgetState,
          toolResults,
          modelResponse.message,
          abortSignal,
        )) {
          if (streamedEvent.type === "assistant_delta") {
            streamedAnswer = `${streamedAnswer === modelResponse.message ? "" : streamedAnswer}${streamedEvent.delta}`;
          }
          yield streamedEvent;
        }
        finalMessage = streamedAnswer.trim() || modelResponse.message;
      }
      const finalAnswer = resolvedLocation?.usedFallback && resolvedLocation.fallbackReason
        ? `${finalMessage}\n\nLocation note: ${resolvedLocation.fallbackReason}`
        : finalMessage;
      const citations = toolResults.filter((result) => result.ok).map((result) => `tool:${result.toolName}`);
      const response: ChatResponsePayload = {
        sessionId: input.sessionId,
        answer: finalAnswer,
        intent,
        toolResults,
        citations,
        resolvedLocation,
        clarificationState: clarificationState ?? undefined,
      };

      const composingEvent: ToolUseChatEvent = {
        type: "tool_result",
        toolName: "assistant_composer",
        toolUseId: `compose-${round}`,
        ok: true,
        locationResolution: normalizeLocationResolution(resolvedLocation),
      };
      emitToolUseEventTelemetry(deps.telemetry, input.sessionId, composingEvent);
      yield {
        type: "tool_result",
        toolName: composingEvent.toolName,
        toolUseId: composingEvent.toolUseId,
        ok: true,
        locationResolution: composingEvent.locationResolution,
      };

      const assistantMessageEvent: ToolUseChatEvent = { type: "assistant_message", text: finalAnswer };
      emitToolUseEventTelemetry(deps.telemetry, input.sessionId, assistantMessageEvent);

      const persisted = await persistAssistantTurn(
        deps,
        existing,
        input,
        response,
        input.location ? undefined : clarificationState ?? undefined,
        budgetState,
        now,
        abortSignal,
      );

      const finalEvent: ToolUseChatEvent = {
        type: "final_answer_completed",
        text: finalAnswer,
        citations,
        payload: response,
      };
      emitToolUseEventTelemetry(deps.telemetry, input.sessionId, finalEvent);
      yield finalEvent;

      const completedEvent: ToolUseChatEvent = { type: "stream_completed", persisted };
      emitToolUseEventTelemetry(deps.telemetry, input.sessionId, completedEvent);
      yield completedEvent;
      return response;
    }

    const assistantContent: ToolUseModelMessage["content"] = [
      ...(modelResponse.assistantMessage
        ? [{ type: "text" as const, text: modelResponse.assistantMessage }]
        : []),
      ...modelResponse.toolCalls.map((toolCall) => ({
        type: "tool_use" as const,
        id: toolCall.id,
        name: toolCall.toolName,
        input: toolCall.input,
      })),
    ];
    messages.push({ role: "assistant", content: assistantContent });

    const toolResultBlocks: ToolUseModelMessage["content"] = [];
    for (const toolCall of modelResponse.toolCalls) {
      const requestedEvent: ToolUseChatEvent = {
        type: "tool_request",
        toolName: toolCall.toolName,
        toolUseId: toolCall.id,
        input: toolCall.input,
      };
      emitToolUseEventTelemetry(deps.telemetry, input.sessionId, requestedEvent);
      yield requestedEvent;

      const startedAt = Date.now();
      const payload = await deps.toolExecutor.execute(toolCall.toolName, toolCall.input);
      throwIfAborted(abortSignal);
      const latencyMs = Date.now() - startedAt;
      const asResult = payload as {
        ok?: boolean;
        error?: { code?: string };
        data?: { locationResolution?: ChatResponsePayload["toolResults"][number]["locationResolution"] };
      };
      const result = {
        toolName: toolCall.toolName,
        ok: Boolean(asResult.ok),
        latencyMs,
        payload,
        errorCode: asResult.ok ? undefined : asResult.error?.code,
        locationResolution: normalizeLocationResolution(
          resolvedLocation,
          asResult.data?.locationResolution,
        ),
      };
      toolResults.push(result);

      if (toolCall.toolName === "budget_plan_tool" && asResult.ok) {
        const parsedBudgetInput = BudgetPlanToolInputSchema.safeParse(toolCall.input);
        const budgetOutput = (payload as { ok: true; data?: BudgetPlanToolOutput }).data;
        if (parsedBudgetInput.success && budgetOutput) {
          emitBudgetLifecycleTelemetry({
            telemetry: deps.telemetry,
            sessionId: input.sessionId,
            previousBudgetState: budgetState,
            toolInput: parsedBudgetInput.data,
            toolOutput: budgetOutput,
          });
          budgetState = mergePersistedBudgetState(
            budgetState,
            parsedBudgetInput.data,
            budgetOutput,
            new Date().toISOString(),
          );
          deps.telemetry.track({
            name: "chat.budget_state.updated",
            attributes: {
              sessionId: input.sessionId,
              missingFieldCount: budgetState.missingFields.length,
              analysisReady: budgetState.analysisReady,
            },
          });
        }
      } else if (toolCall.toolName === "budget_plan_tool") {
        const parsedBudgetInput = BudgetPlanToolInputSchema.safeParse(toolCall.input);
        if (parsedBudgetInput.success) {
          emitBudgetLifecycleTelemetry({
            telemetry: deps.telemetry,
            sessionId: input.sessionId,
            previousBudgetState: budgetState,
            toolInput: parsedBudgetInput.data,
            errorCode: asResult.error?.code ?? "UNKNOWN_ERROR",
          });
        }
      }

      emitLocationCoverageTelemetry({
        telemetry: deps.telemetry,
        sessionId: input.sessionId,
        toolName: result.toolName,
        payload,
        locationResolution: result.locationResolution,
      });

      const resultEvent: ToolUseChatEvent = {
        type: "tool_result",
        toolName: result.toolName,
        toolUseId: toolCall.id,
        ok: result.ok,
        errorCode: result.errorCode,
        locationResolution: result.locationResolution,
      };
      emitToolUseEventTelemetry(deps.telemetry, input.sessionId, resultEvent);
      yield resultEvent;

      toolResultBlocks.push({
        type: "tool_result" as const,
        toolUseId: toolCall.id,
        toolName: toolCall.toolName,
        content: stringifyToolPayload(payload),
        isError: !result.ok,
      });
      deps.telemetry.track({
        name: result.ok ? "chat.tool.executed" : "chat.tool.validation_or_execution_failed",
        attributes: {
          sessionId: input.sessionId,
          toolName: result.toolName,
          ok: result.ok,
          latencyMs: result.latencyMs,
          errorCode: result.errorCode ?? null,
        },
      });
    }

    messages.push({ role: "user", content: toolResultBlocks });
  }

  deps.telemetry.track({
    name: "chat.tool_loop.max_rounds_exceeded",
    attributes: { sessionId: input.sessionId, maxRounds: MAX_TOOL_ROUNDS },
  });

  const safetyBoundAnswer = "I hit the safety limit for tool steps on this turn, so I stopped before guessing. Try narrowing the request or restating the location.";
  const safetyBoundResponse: ChatResponsePayload = {
    sessionId: input.sessionId,
    answer: safetyBoundAnswer,
    intent,
    toolResults,
    citations: toolResults.filter((result) => result.ok).map((result) => `tool:${result.toolName}`),
    resolvedLocation,
    clarificationState: clarificationState ?? undefined,
  };

  for (const chunk of chunkAssistantText(safetyBoundAnswer)) {
    const deltaEvent: ToolUseChatEvent = { type: "assistant_delta", delta: chunk };
    emitToolUseEventTelemetry(deps.telemetry, input.sessionId, deltaEvent);
    yield deltaEvent;
  }

  const persisted = await persistAssistantTurn(
    deps,
    existing,
    input,
    safetyBoundResponse,
    input.location ? undefined : clarificationState ?? undefined,
    budgetState,
    now,
    abortSignal,
  );

  const finalEvent: ToolUseChatEvent = {
    type: "final_answer_completed",
    text: safetyBoundAnswer,
    citations: safetyBoundResponse.citations,
    payload: safetyBoundResponse,
  };
  emitToolUseEventTelemetry(deps.telemetry, input.sessionId, finalEvent);
  yield finalEvent;

  const completedEvent: ToolUseChatEvent = { type: "stream_completed", persisted };
  emitToolUseEventTelemetry(deps.telemetry, input.sessionId, completedEvent);
  yield completedEvent;
  return safetyBoundResponse;
}

export async function answerChatQuestionWithNativeToolUse(
  input: ChatRequest,
  deps: {
    conversationRepository: ConversationRepository;
    modelClient: ModelClient;
    toolCatalog: ToolCatalog;
    telemetry: TelemetryPort;
    toolExecutor: ToolExecutor;
    sessionMemoryEnabled?: boolean;
  },
): Promise<ChatResponsePayload> {
  let finalPayload: ChatResponsePayload | null = null;

  for await (const event of streamChatQuestionWithNativeToolUse(input, {
    ...deps,
    enableAnswerStreaming: false,
  })) {
    if (event.type === "final_answer_completed" && event.payload) {
      finalPayload = event.payload;
    }
  }

  if (!finalPayload) {
    throw new Error("Streaming chat completed without a final payload.");
  }

  return finalPayload;
}