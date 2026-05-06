import { NextResponse } from "next/server";

import { getChatRuntime } from "@/app/api/chat/runtime";
import type { ConversationRecord } from "@/application/ports/ConversationRepository";
import { isSessionMemoryEnabled } from "@/shared/config/sessionMemory";

function buildEmptySessionPayload(sessionId: string, resetRecommended: boolean) {
  return {
    sessionId,
    messages: [] as ConversationRecord["messages"],
    clarificationState: undefined,
    budgetState: undefined,
    resetRecommended,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;

  if (!isSessionMemoryEnabled()) {
    return NextResponse.json({ ok: true, payload: buildEmptySessionPayload(sessionId, false) });
  }

  const runtime = getChatRuntime();

  try {
    const session = await runtime.conversationRepository.getSession(sessionId);

    if (!session) {
      runtime.telemetry.track({
        name: "chat.session.recovered",
        attributes: { sessionId, reason: "missing_or_expired" },
      });

      return NextResponse.json({ ok: true, payload: buildEmptySessionPayload(sessionId, true) });
    }

    runtime.telemetry.track({
      name: "chat.session.loaded",
      attributes: { sessionId, messageCount: session.messages.length },
    });

    return NextResponse.json({
      ok: true,
      payload: {
        sessionId,
        messages: session.messages,
        clarificationState: session.clarificationState,
        budgetState: session.budgetState,
        resetRecommended: false,
      },
    });
  } catch (error) {
    runtime.telemetry.track({
      name: "chat.conversation.read_failed",
      attributes: {
        sessionId,
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      },
    });

    return NextResponse.json(
      { ok: false, error: "Unable to restore the previous conversation right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;

  if (!isSessionMemoryEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const runtime = getChatRuntime();

  try {
    await runtime.conversationRepository.deleteSession(sessionId);
    runtime.telemetry.track({
      name: "chat.session.reset",
      attributes: { sessionId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    runtime.telemetry.track({
      name: "chat.conversation.write_failed",
      attributes: {
        sessionId,
        operation: "delete",
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      },
    });

    return NextResponse.json(
      { ok: false, error: "Unable to reset the current conversation right now." },
      { status: 500 },
    );
  }
}