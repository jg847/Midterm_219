import type { ConversationRepository } from "@/application/ports/ConversationRepository";
import type { ModelClient } from "@/application/ports/ModelClient";
import type { TelemetryPort } from "@/application/ports/TelemetryPort";
import type { ToolExecutor } from "@/application/ports/ToolExecutor";
import { getConversationExpiryIso } from "@/shared/config/sessionMemory";

import { classifyIntent } from "./ClassifyIntent";
import { composeGroundedResponse } from "./ComposeGroundedResponse";
import { executeToolPlan } from "./ExecuteToolPlan";
import { selectTools } from "./SelectTools";
import type { ChatRequest, ChatResponsePayload } from "./types";

export async function answerChatQuestion(
  input: ChatRequest,
  deps: {
    conversationRepository: ConversationRepository;
    modelClient: ModelClient;
    telemetry: TelemetryPort;
    toolExecutor: ToolExecutor;
    sessionMemoryEnabled?: boolean;
  },
): Promise<ChatResponsePayload> {
  const sessionMemoryEnabled = deps.sessionMemoryEnabled ?? true;
  const intent = classifyIntent(input.message);
  const selectedTools = selectTools(intent);

  let existing = null;
  if (sessionMemoryEnabled) {
    try {
      existing = await deps.conversationRepository.getSession(input.sessionId);
    } catch (error) {
      deps.telemetry.track({
        name: "chat.conversation.read_failed",
        attributes: {
          sessionId: input.sessionId,
          errorMessage: error instanceof Error ? error.message : "unknown_error",
        },
      });
      throw error;
    }

    if (existing) {
      deps.telemetry.track({
        name: "chat.session.loaded",
        attributes: { sessionId: input.sessionId, messageCount: existing.messages.length },
      });
    }
  }

  deps.telemetry.track({
    name: "chat.intent.classified",
    attributes: { intent, toolCount: selectedTools.length },
  });

  const toolResults = await executeToolPlan(
    deps.toolExecutor,
    selectedTools,
    input.message,
    input.location,
  );

  for (const result of toolResults) {
    deps.telemetry.track({
      name: "chat.tool.executed",
      attributes: {
        toolName: result.toolName,
        ok: result.ok,
        latencyMs: result.latencyMs,
        errorCode: result.errorCode ?? null,
      },
    });
  }

  const composed = await composeGroundedResponse(
    deps.modelClient,
    intent,
    input.message,
    existing?.messages ?? [],
    toolResults,
  );

  const now = new Date().toISOString();

  if (sessionMemoryEnabled) {
    try {
      await deps.conversationRepository.saveSession({
        sessionId: input.sessionId,
        messages: [
          ...(existing?.messages ?? []),
          { role: "user", content: input.message, createdAt: now },
          {
            role: "assistant",
            content: composed.answer,
            createdAt: now,
            artifacts: [
              ...(composed.citations.length > 0
                ? [{ type: "citation_list" as const, citations: composed.citations }]
                : []),
              ...(toolResults.length > 0
                ? [
                    {
                      type: "trace_summary" as const,
                      summary: toolResults
                        .map((result) => `${result.toolName}: ${result.ok ? "ok" : `error(${result.errorCode ?? "unknown"})`}`)
                        .join("; "),
                    },
                    ...toolResults.map((result) => ({
                      type: "tool_result" as const,
                      toolName: result.toolName,
                      payload: result.payload,
                      ok: result.ok,
                      latencyMs: result.latencyMs,
                      errorCode: result.errorCode,
                    })),
                  ]
                : []),
            ],
          },
        ],
        traces: [
          ...(existing?.traces ?? []),
          ...toolResults.map((result) => ({
            toolName: result.toolName,
            latencyMs: result.latencyMs,
            ok: result.ok,
            errorCode: result.errorCode,
          })),
        ],
        lastActivityAt: now,
        expiresAt: getConversationExpiryIso(new Date(now)),
      });

      deps.telemetry.track({
        name: existing ? "chat.session.updated" : "chat.session.created",
        attributes: { sessionId: input.sessionId },
      });
    } catch (error) {
      deps.telemetry.track({
        name: "chat.conversation.write_failed",
        attributes: {
          sessionId: input.sessionId,
          errorMessage: error instanceof Error ? error.message : "unknown_error",
        },
      });
      throw error;
    }
  }

  return {
    sessionId: input.sessionId,
    answer: composed.answer,
    intent,
    toolResults,
    citations: composed.citations,
  };
}
