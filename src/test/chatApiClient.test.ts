import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  hydrateChatSession,
  resetChatSession,
  sendChatMessage,
  streamChatMessage,
} from "@/interface-adapters/chat/chatApiClient";

function buildStreamResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("chatApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the chat API endpoint for browser submissions", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        payload: {
          sessionId: "s",
          answer: "ok",
          intent: "general",
          citations: [],
          toolResults: [],
        },
      }),
    } as Response);

    const result = await sendChatMessage({ sessionId: "s", message: "hello" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.ok).toBe(true);
  });

  it("does not short-circuit the request when mock mode is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_CHAT", "true");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        payload: {
          sessionId: "s",
          answer: "mock",
          intent: "general",
          citations: ["tool:mock"],
          toolResults: [],
        },
      }),
    } as Response);

    const result = await sendChatMessage({ sessionId: "s", message: "hello" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.ok).toBe(true);
  });

  it("uses the hydration endpoint for restoring a chat session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        payload: {
          sessionId: "s",
          messages: [],
          resetRecommended: false,
        },
      }),
    } as Response);

    const result = await hydrateChatSession("s");

    expect(fetchMock).toHaveBeenCalledWith("/api/chat/session/s", expect.objectContaining({ method: "GET" }));
    expect(result.ok).toBe(true);
  });

  it("parses typed SSE chat events from the streaming route", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildStreamResponse([
        'data: {"type":"stream_started","sessionId":"s","mode":"native_tool_use"}\n\n',
        'data: {"type":"assistant_delta","delta":"Hello "}\n\n',
        'data: {"type":"final_payload","payload":{"sessionId":"s","answer":"Hello world","intent":"general","citations":[],"toolResults":[]}}\n\n',
        'data: {"type":"stream_completed","persisted":true}\n\n',
      ]),
    );

    const events: string[] = [];

    for await (const event of streamChatMessage({ sessionId: "s", message: "hello" })) {
      events.push(event.type);
    }

    expect(events).toEqual([
      "stream_started",
      "assistant_delta",
      "final_payload",
      "stream_completed",
    ]);
  });

  it("fails closed on malformed stream events", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildStreamResponse(['data: {"type":"not_real"}\n\n']),
    );

    const events = [] as string[];
    let errorCode: string | undefined;

    for await (const event of streamChatMessage({ sessionId: "s", message: "hello" })) {
      events.push(event.type);
      if (event.type === "stream_error") {
        errorCode = event.code;
      }
    }

    expect(events).toEqual(["stream_error"]);
    expect(errorCode).toBe("STREAM_INVALID_EVENT");
  });

  it("fails closed on invalid nested final payload shapes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildStreamResponse([
        'data: {"type":"final_payload","payload":{"sessionId":"s","answer":"Hello world","intent":"general","citations":[],"toolResults":"bad"}}\n\n',
      ]),
    );

    const events: string[] = [];
    let errorCode: string | undefined;

    for await (const event of streamChatMessage({ sessionId: "s", message: "hello" })) {
      events.push(event.type);
      if (event.type === "stream_error") {
        errorCode = event.code;
      }
    }

    expect(events).toEqual(["stream_error"]);
    expect(errorCode).toBe("STREAM_INVALID_EVENT");
  });

  it("uses the delete session endpoint for reset", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    const result = await resetChatSession("s");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat/session/s",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result.ok).toBe(true);
  });
});
