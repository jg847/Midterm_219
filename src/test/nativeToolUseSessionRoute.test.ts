import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SESSION_ID = "22222222-2222-4222-8222-222222222222";

const { runtime } = vi.hoisted(() => {
  let storedRecord: {
    sessionId: string;
    messages: Array<{ role: string; content: string; createdAt: string; artifacts?: unknown[] }>;
    traces: unknown[];
    clarificationState?: unknown;
    lastActivityAt?: string;
    expiresAt?: string;
  } | null = null;

  const conversationRepository = {
    async getSession(sessionId: string) {
      if (!storedRecord || storedRecord.sessionId !== sessionId) {
        return null;
      }

      return storedRecord;
    },
    async saveSession(record: typeof storedRecord extends null ? never : NonNullable<typeof storedRecord>) {
      storedRecord = record;
    },
    async deleteSession() {
      storedRecord = null;
    },
    clear() {
      storedRecord = null;
    },
  };
  let modelScript: Array<{ type: "assistant_message"; message: string; stopReason: "end_turn" | "stop_sequence" | "max_tokens" }> = [];
  const modelClient = {
    setScript(
      script: Array<{ type: "assistant_message"; message: string; stopReason: "end_turn" | "stop_sequence" | "max_tokens" }>,
    ) {
      modelScript = [...script];
    },
    async generate() {
      return "unused";
    },
    async generateToolUse() {
      return modelScript.shift() ?? { type: "assistant_message" as const, message: "No scripted response", stopReason: "end_turn" as const };
    },
  };

  return {
    runtime: {
      conversationRepository,
      modelClient,
      telemetry: { track: vi.fn() },
      toolCatalog: { listTools: () => [] },
      toolExecutor: { execute: vi.fn() },
    },
  };
});

vi.mock("@/app/api/chat/runtime", () => ({
  getChatRuntime: () => runtime,
}));

import { POST as postChat } from "@/app/api/chat/route";
import { GET as getSession } from "@/app/api/chat/session/[sessionId]/route";
import {
  AMBIGUOUS_STATE_REQUEST,
  DISCLOSED_FALLBACK_LOCATION_NOTE,
} from "@/test/utils/nativeToolUseFixtures";

function createChatRequest(message: string) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      message,
    }),
  });
}

describe("native tool use session route integration", () => {
  beforeEach(() => {
    runtime.conversationRepository.clear();
    runtime.modelClient.setScript([]);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SESSION_MEMORY", "true");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE", "true");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_CHAT", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    runtime.conversationRepository.clear();
  });

  it("persists clarification state through hydration and uses disclosed fallback on the repeated state-only turn", async () => {
    const firstResponse = await postChat(createChatRequest(AMBIGUOUS_STATE_REQUEST));
    const firstPayload = (await firstResponse.json()) as {
      ok: boolean;
      payload?: { clarificationQuestion?: string; clarificationState?: { state: string; disclosedFallbackPermitted: boolean } };
    };

    expect(firstResponse.status).toBe(200);
    expect(firstPayload.ok).toBe(true);
    expect(firstPayload.payload?.clarificationQuestion).toContain("Texas");
    expect(firstPayload.payload?.clarificationState?.state).toBe("TX");
    expect(firstPayload.payload?.clarificationState?.disclosedFallbackPermitted).toBe(false);

    const hydratedAfterFirstTurn = await getSession(new Request("http://localhost/api/chat/session"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    const hydratedPayload = (await hydratedAfterFirstTurn.json()) as {
      ok: boolean;
      payload?: { clarificationState?: { state: string; disclosedFallbackPermitted: boolean }; messages?: Array<{ role: string }> };
    };

    expect(hydratedPayload.ok).toBe(true);
    expect(hydratedPayload.payload?.clarificationState?.state).toBe("TX");
    expect(hydratedPayload.payload?.clarificationState?.disclosedFallbackPermitted).toBe(false);
    expect(hydratedPayload.payload?.messages).toHaveLength(2);

    runtime.modelClient.setScript([
      {
        type: "assistant_message",
        stopReason: "end_turn",
        message: "I used Houston, TX for this pass and here is the rental baseline.",
      },
    ]);

    const secondResponse = await postChat(createChatRequest(AMBIGUOUS_STATE_REQUEST));
    const secondPayload = (await secondResponse.json()) as {
      ok: boolean;
      payload?: {
        answer: string;
        resolvedLocation?: { resolutionLabel: string; usedFallback: boolean };
        clarificationState?: { disclosedFallbackPermitted: boolean };
      };
    };

    expect(secondResponse.status).toBe(200);
    expect(secondPayload.ok).toBe(true);
    expect(secondPayload.payload?.resolvedLocation?.resolutionLabel).toBe("Houston, TX");
    expect(secondPayload.payload?.resolvedLocation?.usedFallback).toBe(true);
    expect(secondPayload.payload?.answer).toContain("Location note:");
    expect(secondPayload.payload?.answer).toContain(DISCLOSED_FALLBACK_LOCATION_NOTE);
    expect(secondPayload.payload?.clarificationState?.disclosedFallbackPermitted).toBe(true);

    const hydratedAfterSecondTurn = await getSession(new Request("http://localhost/api/chat/session"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    const hydratedSecondPayload = (await hydratedAfterSecondTurn.json()) as {
      ok: boolean;
      payload?: { clarificationState?: { disclosedFallbackPermitted: boolean }; messages?: Array<{ role: string; content: string }> };
    };

    expect(hydratedSecondPayload.ok).toBe(true);
    expect(hydratedSecondPayload.payload?.clarificationState?.disclosedFallbackPermitted).toBe(true);
    expect(hydratedSecondPayload.payload?.messages).toHaveLength(4);
    expect(hydratedSecondPayload.payload?.messages?.[3]?.content).toContain(DISCLOSED_FALLBACK_LOCATION_NOTE);
  });
});