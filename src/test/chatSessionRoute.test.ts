import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postChat } from "@/app/api/chat/route";
import { DELETE as deleteSession, GET as getSession } from "@/app/api/chat/session/[sessionId]/route";
import { InMemoryConversationRepository } from "@/frameworks/repositories/conversation/InMemoryConversationRepository";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";

describe("chat session routes", () => {
  beforeEach(() => {
    InMemoryConversationRepository.clear();
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SESSION_MEMORY", "true");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_CHAT", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    InMemoryConversationRepository.clear();
  });

  it("persists and hydrates a session transcript through the chat route", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        message: "Can I afford this move?",
      }),
    });

    const postResponse = await postChat(request);
    const postPayload = (await postResponse.json()) as { ok: boolean };

    expect(postResponse.status).toBe(200);
    expect(postPayload.ok).toBe(true);

    const hydrateResponse = await getSession(new Request("http://localhost/api/chat/session"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    const hydratePayload = (await hydrateResponse.json()) as {
      ok: boolean;
      payload?: { sessionId: string; messages: Array<{ role: string; artifacts?: Array<{ type: string }> }> };
    };

    expect(hydrateResponse.status).toBe(200);
    expect(hydratePayload.ok).toBe(true);
    expect(hydratePayload.payload?.sessionId).toBe(SESSION_ID);
    expect(hydratePayload.payload?.messages).toHaveLength(2);
    expect(hydratePayload.payload?.messages[1]?.artifacts?.some((artifact) => artifact.type === "tool_result")).toBe(true);
  });

  it("returns reset recommendation for missing sessions and clears persisted sessions on delete", async () => {
    const missingResponse = await getSession(new Request("http://localhost/api/chat/session"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    const missingPayload = (await missingResponse.json()) as {
      ok: boolean;
      payload?: { resetRecommended?: boolean };
    };

    expect(missingPayload.payload?.resetRecommended).toBe(true);

    await postChat(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID, message: "Persist this conversation" }),
      }),
    );

    const deleteResponse = await deleteSession(new Request("http://localhost/api/chat/session"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });

    expect(deleteResponse.status).toBe(200);

    const afterDeleteResponse = await getSession(new Request("http://localhost/api/chat/session"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    const afterDeletePayload = (await afterDeleteResponse.json()) as {
      ok: boolean;
      payload?: { resetRecommended?: boolean; messages?: unknown[] };
    };

    expect(afterDeletePayload.payload?.messages).toHaveLength(0);
    expect(afterDeletePayload.payload?.resetRecommended).toBe(true);
  });

  it("hydrates persisted budget state for a mocked budget conversation", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        message: "Can you build me a budget for Newark, NJ with income $6200, rent $2100, and utilities $200?",
      }),
    });

    const postResponse = await postChat(request);
    const postPayload = (await postResponse.json()) as { ok: boolean };

    expect(postResponse.status).toBe(200);
    expect(postPayload.ok).toBe(true);

    const hydrateResponse = await getSession(new Request("http://localhost/api/chat/session"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    const hydratePayload = (await hydrateResponse.json()) as {
      ok: boolean;
      payload?: {
        budgetState?: { profile?: { grossMonthlyIncome?: number; monthlyHousingCost?: number }; missingFields?: string[] };
      };
    };

    expect(hydratePayload.ok).toBe(true);
    expect(hydratePayload.payload?.budgetState?.profile?.grossMonthlyIncome).toBe(6200);
    expect(hydratePayload.payload?.budgetState?.profile?.monthlyHousingCost).toBe(2100);
    expect(hydratePayload.payload?.budgetState?.missingFields).toContain("transportation");
  });

  it("falls back cleanly when the budget capability flag is off in mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_BUDGET_CAPABILITY", "false");

    const response = await postChat(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: SESSION_ID,
          message: "Can you build me a budget for Newark, NJ?",
        }),
      }),
    );
    const payload = (await response.json()) as {
      ok: boolean;
      payload?: { answer?: string; toolResults?: unknown[] };
    };

    expect(payload.ok).toBe(true);
    expect(payload.payload?.answer).toContain("temporarily unavailable");
    expect(payload.payload?.toolResults).toHaveLength(0);
  });
});