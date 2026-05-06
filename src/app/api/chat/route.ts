import { NextResponse } from "next/server";

import { classifyIntent } from "@/application/chat/ClassifyIntent";
import { answerChatQuestion } from "@/application/chat/AnswerChatQuestion";
import {
  answerChatQuestionWithNativeToolUse,
  streamChatQuestionWithNativeToolUse,
} from "@/application/chat/AnswerChatQuestionWithNativeToolUse";
import {
  buildClarificationQuestion,
  getClarificationState,
} from "@/application/chat/LocationGrounding";
import { ChatRequestSchema, type ChatResponsePayload } from "@/application/chat/types";
import { moderateUserMessage } from "@/application/chat/moderation";
import { analyzeBudgetPlan } from "@/domain/entities/BudgetPlan";
import type { PersistedBudgetState } from "@/domain/models/BudgetProfile";
import { buildRequestKey, checkApiRateLimit } from "@/frameworks/http/ApiRateLimiter";
import { createTelemetry } from "@/frameworks/telemetry/createTelemetry";
import type {
  ChatFinalPayloadEvent,
  ChatStreamEvent,
  ChatToolStatusEvent,
} from "@/interface-adapters/chat/types";
import {
  isBudgetCapabilityEnabled,
  isNativeToolUseEnabled,
  isStreamingChatEnabled,
} from "@/shared/config/chatRuntime";
import { getConversationExpiryIso, isSessionMemoryEnabled } from "@/shared/config/sessionMemory";

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

const moderationTelemetry = createTelemetry();

type ChatRuntime = Awaited<ReturnType<typeof loadChatRuntime>>;

function trackModerationResult(
  sessionId: string,
  result: ReturnType<typeof moderateUserMessage>,
) {
  for (const outcome of result.outcomes) {
    if (outcome.kind !== "transform") {
      continue;
    }

    moderationTelemetry.track({
      name: "chat.moderation.transformed",
      attributes: {
        route: "/api/chat",
        sessionId,
        stage: outcome.stage,
      },
    });
  }

  if (!result.ok) {
    moderationTelemetry.track({
      name: "chat.moderation.blocked",
      attributes: {
        route: "/api/chat",
        sessionId,
        stage: result.stage,
        transformed: result.outcomes.some((outcome) => outcome.kind === "transform"),
      },
    });
  }
}

async function loadChatRuntime() {
  const { getChatRuntime } = await import("@/app/api/chat/runtime");
  return getChatRuntime();
}

async function loadConversationRepository() {
  const runtimeModule = await import("@/app/api/chat/runtime");

  if ("getConversationRepository" in runtimeModule && typeof runtimeModule.getConversationRepository === "function") {
    return runtimeModule.getConversationRepository();
  }

  return runtimeModule.getChatRuntime().conversationRepository;
}

function wantsStreamingResponse(request: Request, body: { stream?: boolean }): boolean {
  if (!isStreamingChatEnabled()) {
    return false;
  }

  if (body.stream) {
    return true;
  }

  return request.headers.get("accept")?.includes("text/event-stream") ?? false;
}

function chunkText(text: string): string[] {
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

function encodeSseEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

function createToolStatusEvent(event: ChatToolStatusEvent): ChatToolStatusEvent {
  return event;
}

async function tryHandleClarificationPreflight(
  input: {
    sessionId: string;
    message: string;
    location?: {
      formatted: string;
      city: string;
      state: string;
      country: string;
      postalCode?: string;
      radiusMiles: number;
    };
  },
  sessionMemoryEnabled: boolean,
): Promise<ChatResponsePayload | null> {
  if (input.location) {
    return null;
  }

  const directClarificationState = getClarificationState(input.message, undefined);
  if (!directClarificationState) {
    return null;
  }

  const repository = await loadConversationRepository();
  const existing = sessionMemoryEnabled ? await repository.getSession(input.sessionId) : null;
  const clarificationState = getClarificationState(input.message, existing?.clarificationState);

  if (!clarificationState || clarificationState.disclosedFallbackPermitted) {
    return null;
  }

  const clarificationQuestion = buildClarificationQuestion(clarificationState);
  const payload: ChatResponsePayload = {
    sessionId: input.sessionId,
    answer: clarificationQuestion,
    intent: classifyIntent(input.message),
    toolResults: [],
    citations: [],
    clarificationQuestion,
    clarificationState,
  };

  if (sessionMemoryEnabled) {
    const now = new Date().toISOString();
    await repository.saveSession({
      sessionId: input.sessionId,
      messages: [
        ...(existing?.messages ?? []),
        { role: "user", content: input.message, createdAt: now },
        {
          role: "assistant",
          content: clarificationQuestion,
          createdAt: now,
        },
      ],
      traces: existing?.traces ?? [],
      clarificationState,
      budgetState: existing?.budgetState,
      lastActivityAt: now,
      expiresAt: getConversationExpiryIso(new Date(now)),
    });
  }

  return payload;
}

function buildToolStatusMessage(phase: ChatToolStatusEvent["phase"], toolName: string, locationLabel?: string): string {
  const suffix = locationLabel ? ` for ${locationLabel}` : "";

  switch (phase) {
    case "requested":
      return `Planning ${toolName}${suffix}.`;
    case "running":
      return `Running ${toolName}${suffix}.`;
    case "completed":
      return `Completed ${toolName}${suffix}.`;
    case "failed":
      return `Ran ${toolName}${suffix}, but it returned an error.`;
    case "composing":
      return `Composing the final answer${suffix}.`;
  }
}

function streamMockChatPayload(
  request: Request,
  sessionMemoryEnabled: boolean,
  runtime: ChatRuntime,
  body: { sessionId: string; message: string },
): Response {
  const mockResponse = buildMockChatPayload(body.sessionId, body.message, isBudgetCapabilityEnabled());
  const payload = mockResponse.payload;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      request.signal.addEventListener("abort", () => {
        runtime.telemetry.track({
          name: "chat.stream.client_disconnected",
          attributes: { sessionId: body.sessionId, mock: true },
        });
        close();
      });

      controller.enqueue(
        encodeSseEvent({
          type: "stream_started",
          sessionId: body.sessionId,
          mode: "native_tool_use",
        }),
      );
      if (payload.toolResults[0]) {
        controller.enqueue(
          encodeSseEvent(
            createToolStatusEvent({
              type: "tool_status",
              phase: "running",
              toolName: payload.toolResults[0].toolName,
              toolUseId: "mock-tool-1",
              message: `Running ${payload.toolResults[0].toolName}.`,
              ok: true,
            }),
          ),
        );
      }

      for (const chunk of chunkText(payload.answer)) {
        controller.enqueue(encodeSseEvent({ type: "assistant_delta", delta: chunk }));
      }

      if (sessionMemoryEnabled) {
        try {
          const existing = await runtime.conversationRepository.getSession(body.sessionId);
          const now = new Date().toISOString();

          await runtime.conversationRepository.saveSession({
            sessionId: body.sessionId,
            messages: [
              ...(existing?.messages ?? []),
              { role: "user", content: body.message, createdAt: now },
              {
                role: "assistant",
                content: payload.answer,
                createdAt: now,
                artifacts: [
                  { type: "citation_list", citations: payload.citations },
                  {
                    type: "trace_summary",
                    summary: `${payload.toolResults[0]?.toolName ?? "mock_tool"}: ok`,
                  },
                  ...payload.toolResults.map((result) => ({
                    type: "tool_result" as const,
                    toolName: result.toolName,
                    payload: result.payload,
                    ok: result.ok,
                    latencyMs: result.latencyMs,
                    errorCode: result.errorCode,
                  })),
                ],
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
            budgetState: mockResponse.budgetState ?? existing?.budgetState,
            lastActivityAt: now,
            expiresAt: getConversationExpiryIso(new Date(now)),
          });
        } catch (error) {
          controller.enqueue(
            encodeSseEvent({
              type: "stream_error",
              message: error instanceof Error ? error.message : "Mock chat persistence failed.",
              retryable: true,
              code: "MOCK_PERSISTENCE_FAILED",
            }),
          );
          close();
          return;
        }
      }

      const finalEvent: ChatFinalPayloadEvent = {
        type: "final_payload",
        payload,
      };
      controller.enqueue(encodeSseEvent(finalEvent));
      controller.enqueue(encodeSseEvent({ type: "stream_completed", persisted: sessionMemoryEnabled }));
      close();
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}

function extractMockBudgetAmount(message: string, pattern: RegExp, fallback: number): number {
  const match = message.match(pattern);
  const raw = match?.[1]?.replace(/[$,]/g, "");
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}

function extractMockBudgetLocation(message: string): string {
  const match = message.match(/(?:for|in)\s+([A-Za-z .'-]+(?:,\s*[A-Z]{2})?)/i);
  const location = match?.[1]?.trim().replace(/[?.!,]+$/, "");
  return location && location.length >= 3 ? location : "Austin, TX";
}

function buildMockBudgetPayload(sessionId: string, message: string): {
  payload: {
    sessionId: string;
    answer: string;
    intent: "affordability";
    citations: string[];
    toolResults: Array<{
      toolName: string;
      ok: boolean;
      latencyMs: number;
      payload: unknown;
      errorCode?: string;
    }>;
  };
  budgetState: PersistedBudgetState;
} {
  const locationLabel = extractMockBudgetLocation(message);
  const grossMonthlyIncome = extractMockBudgetAmount(
    message,
    /(?:income|make|earn|salary)\D*\$?([\d,]+)/i,
    5000,
  );
  const monthlyHousingCost = extractMockBudgetAmount(
    message,
    /(?:rent|housing|payment|cost)\D*\$?([\d,]+)/i,
    1800,
  );
  const utilities = extractMockBudgetAmount(message, /utilities\D*\$?([\d,]+)/i, 150);
  const analysis = analyzeBudgetPlan({
    grossMonthlyIncome,
    monthlyHousingCost,
    utilities,
  });
  const burdenPctText = typeof analysis.burdenPct === "number" ? `${Math.round(analysis.burdenPct)}%` : "an unknown share";

  return {
    payload: {
      sessionId,
      answer:
        `This is a deterministic budget mock response for ${locationLabel}. Based on about $${grossMonthlyIncome}/month income and $${monthlyHousingCost}/month housing, the current plan is ${analysis.verdict} with housing taking ${burdenPctText} of income.`,
      intent: "affordability",
      citations: ["tool:budget_plan_tool"],
      toolResults: [
        {
          toolName: "budget_plan_tool",
          ok: true,
          latencyMs: 14,
          payload: {
            ok: true,
            data: {
              ...analysis,
              locationResolution: {
                resolvedLabel: locationLabel,
                resolutionKind: "exact",
                usedFallback: false,
              },
            },
          },
        },
      ],
    },
    budgetState: {
      profile: {
        grossMonthlyIncome,
        monthlyHousingCost,
        utilities,
      },
      missingFields: analysis.missingFields,
      lastUpdatedAt: new Date().toISOString(),
      analysisReady: !analysis.isPartial,
    },
  };
}

function buildMockChatPayload(sessionId: string, message: string, budgetCapabilityEnabled: boolean): {
  payload: {
    sessionId: string;
    answer: string;
    intent: "general" | "affordability";
    citations: string[];
    toolResults: Array<{
      toolName: string;
      ok: boolean;
      latencyMs: number;
      payload: unknown;
      errorCode?: string;
    }>;
  };
  budgetState?: PersistedBudgetState;
} {
  if (/(budget|afford|salary|rent fit|can i afford)/i.test(message)) {
    if (!budgetCapabilityEnabled) {
      return {
        payload: {
          sessionId,
          answer:
            "This is a deterministic budget mock fallback. Structured budget planning is temporarily unavailable, but I can still help with grounded housing, jobs, and location guidance.",
          intent: "general",
          citations: [],
          toolResults: [],
        },
      };
    }

    return buildMockBudgetPayload(sessionId, message);
  }

  return {
    payload: {
      sessionId,
      answer:
        "This is a mock response from the Sprint 4 chat client. Session restore and reset now use the same route contracts as live chat.",
      intent: "general",
      citations: ["tool:mock"],
      toolResults: [
        {
          toolName: "mock_tool",
          ok: true,
          latencyMs: 12,
          payload: { status: "mock" },
          errorCode: undefined,
        },
      ],
    },
  };
}

export async function POST(request: Request) {
  const sessionMemoryEnabled = isSessionMemoryEnabled();
  const rateLimit = await checkApiRateLimit({
    bucket: "api-chat",
    key: buildRequestKey(request),
    maxRequests: Number(process.env.API_RATE_LIMIT_CHAT_PER_MINUTE ?? 20),
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Rate limit exceeded. Please retry shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid chat payload",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const moderation = moderateUserMessage(parsed.data.message);
  trackModerationResult(parsed.data.sessionId, moderation);

  if (!moderation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: moderation.reason,
      },
      { status: 400 },
    );
  }

  const moderatedInput = {
    ...parsed.data,
    message: moderation.message,
  };

  const wantsStream = wantsStreamingResponse(request, moderatedInput);

  if (!wantsStream && isNativeToolUseEnabled() && process.env.NEXT_PUBLIC_USE_MOCK_CHAT !== "true") {
    const clarificationPayload = await tryHandleClarificationPreflight(moderatedInput, sessionMemoryEnabled);
    if (clarificationPayload) {
      return NextResponse.json({ ok: true, payload: clarificationPayload });
    }
  }

  let runtime: ChatRuntime | null = null;

  try {
    runtime = await loadChatRuntime();
    if (!runtime) {
      throw new Error("Chat runtime failed to initialize");
    }

    const activeRuntime = runtime;

    activeRuntime.telemetry.track({
      name: "chat.request.received",
      attributes: { route: "/api/chat" },
    });

    if (process.env.NEXT_PUBLIC_USE_MOCK_CHAT === "true") {
      if (wantsStream) {
        return streamMockChatPayload(request, sessionMemoryEnabled, activeRuntime, moderatedInput);
      }

      const mockResponse = buildMockChatPayload(
        moderatedInput.sessionId,
        moderatedInput.message,
        isBudgetCapabilityEnabled(),
      );
      const payload = mockResponse.payload;

      if (sessionMemoryEnabled) {
        try {
          const existing = await activeRuntime.conversationRepository.getSession(moderatedInput.sessionId);
          const now = new Date().toISOString();

          await activeRuntime.conversationRepository.saveSession({
            sessionId: moderatedInput.sessionId,
            messages: [
              ...(existing?.messages ?? []),
              { role: "user", content: moderatedInput.message, createdAt: now },
              {
                role: "assistant",
                content: payload.answer,
                createdAt: now,
                artifacts: [
                  { type: "citation_list", citations: payload.citations },
                  {
                    type: "trace_summary",
                    summary: payload.toolResults.length === 0
                      ? "no_tool: unavailable"
                      : payload.toolResults
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
                ],
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
            budgetState: mockResponse.budgetState ?? existing?.budgetState,
            lastActivityAt: now,
            expiresAt: getConversationExpiryIso(new Date(now)),
          });

          activeRuntime.telemetry.track({
            name: existing ? "chat.session.updated" : "chat.session.created",
            attributes: { sessionId: moderatedInput.sessionId, mock: true },
          });
        } catch (error) {
          activeRuntime.telemetry.track({
            name: "chat.conversation.write_failed",
            attributes: {
              sessionId: moderatedInput.sessionId,
              mock: true,
              errorMessage: error instanceof Error ? error.message : "unknown_error",
            },
          });

          return NextResponse.json(
            {
              ok: false,
              error: "Chat service is temporarily unavailable. Please retry.",
            },
            { status: 500 },
          );
        }
      }

      return NextResponse.json({ ok: true, payload });
    }

    const answerChat = isNativeToolUseEnabled()
      ? answerChatQuestionWithNativeToolUse
      : answerChatQuestion;

    activeRuntime.telemetry.track({
      name: "chat.orchestration.selected",
      attributes: {
        route: "/api/chat",
        mode: isNativeToolUseEnabled() ? (wantsStream ? "native_tool_use_stream" : "native_tool_use") : "legacy_regex",
      },
    });

    if (wantsStream && isNativeToolUseEnabled()) {
      const eventStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let closed = false;
          const close = () => {
            if (!closed) {
              closed = true;
              controller.close();
            }
          };

          request.signal.addEventListener("abort", () => {
            activeRuntime.telemetry.track({
              name: "chat.stream.client_disconnected",
              attributes: { sessionId: moderatedInput.sessionId },
            });
            close();
          });

          try {
            for await (const event of streamChatQuestionWithNativeToolUse(moderatedInput, {
              conversationRepository: activeRuntime.conversationRepository,
              modelClient: activeRuntime.modelClient,
              toolCatalog: activeRuntime.toolCatalog,
              telemetry: activeRuntime.telemetry,
              toolExecutor: activeRuntime.toolExecutor,
              sessionMemoryEnabled,
              abortSignal: request.signal,
            })) {
              if (closed) {
                break;
              }

              switch (event.type) {
                case "stream_started":
                  controller.enqueue(
                    encodeSseEvent({
                      type: "stream_started",
                      sessionId: event.sessionId,
                      mode: event.mode,
                    }),
                  );
                  break;
                case "tool_request": {
                  const locationLabel = moderatedInput.location?.formatted;
                  controller.enqueue(
                    encodeSseEvent(
                      createToolStatusEvent({
                        type: "tool_status",
                        phase: "requested",
                        toolName: event.toolName,
                        toolUseId: event.toolUseId,
                        locationLabel,
                        message: buildToolStatusMessage("requested", event.toolName, locationLabel),
                      }),
                    ),
                  );
                  controller.enqueue(
                    encodeSseEvent(
                      createToolStatusEvent({
                        type: "tool_status",
                        phase: "running",
                        toolName: event.toolName,
                        toolUseId: event.toolUseId,
                        locationLabel,
                        message: buildToolStatusMessage("running", event.toolName, locationLabel),
                      }),
                    ),
                  );
                  break;
                }
                case "tool_result": {
                  const isComposer = event.toolName === "assistant_composer";
                  const phase = isComposer ? "composing" : event.ok ? "completed" : "failed";
                  const locationLabel = event.locationResolution?.resolvedLabel ?? moderatedInput.location?.formatted;
                  controller.enqueue(
                    encodeSseEvent(
                      createToolStatusEvent({
                        type: "tool_status",
                        phase,
                        toolName: isComposer ? undefined : event.toolName,
                        toolUseId: event.toolUseId,
                        locationLabel,
                        ok: event.ok,
                        errorCode: event.errorCode,
                        message: buildToolStatusMessage(phase, isComposer ? "assistant" : event.toolName, locationLabel),
                      }),
                    ),
                  );
                  break;
                }
                case "clarification_prompt":
                  controller.enqueue(
                    encodeSseEvent({
                      type: "clarification_prompt",
                      question: event.question,
                      clarificationState: event.clarificationState,
                    }),
                  );
                  break;
                case "assistant_delta":
                  controller.enqueue(encodeSseEvent({ type: "assistant_delta", delta: event.delta }));
                  break;
                case "final_answer_completed":
                  if (event.payload) {
                    controller.enqueue(
                      encodeSseEvent({
                        type: "final_payload",
                        payload: event.payload,
                      }),
                    );
                  }
                  break;
                case "stream_completed":
                  controller.enqueue(
                    encodeSseEvent({
                      type: "stream_completed",
                      persisted: event.persisted,
                    }),
                  );
                  break;
                case "stream_error":
                  controller.enqueue(
                    encodeSseEvent({
                      type: "stream_error",
                      message: event.message,
                      retryable: event.retryable,
                      code: event.code,
                    }),
                  );
                  break;
                case "assistant_message":
                  break;
              }
            }
          } catch (error) {
            if (request.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
              close();
              return;
            }

            controller.enqueue(
              encodeSseEvent({
                type: "stream_error",
                message: error instanceof Error ? error.message : "Chat service is temporarily unavailable. Please retry.",
                retryable: true,
                code: "STREAM_FAILED",
              }),
            );
          } finally {
            close();
          }
        },
      });

      return new Response(eventStream, { headers: STREAM_HEADERS });
    }

    const payload = await answerChat(moderatedInput, {
      conversationRepository: activeRuntime.conversationRepository,
      modelClient: activeRuntime.modelClient,
      toolCatalog: activeRuntime.toolCatalog,
      telemetry: activeRuntime.telemetry,
      toolExecutor: activeRuntime.toolExecutor,
      sessionMemoryEnabled,
    });

    return NextResponse.json({ ok: true, payload });
  } catch (error) {
    runtime?.telemetry.track({
      name: "chat.request.failed",
      attributes: {
        route: "/api/chat",
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Chat service is temporarily unavailable. Please retry.",
      },
      { status: 500 },
    );
  }
}
