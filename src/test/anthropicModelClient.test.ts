import { afterEach, describe, expect, it, vi } from "vitest";

import { AnthropicModelClient } from "@/frameworks/ai/AnthropicModelClient";

describe("AnthropicModelClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses a chat-appropriate max token budget above the legacy ceiling", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_CHAT_MAX_TOKENS", "950");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Grounded answer" }],
      }),
    } as Response);

    const client = new AnthropicModelClient();
    await client.generate({
      system: "system",
      messages: [{ role: "user", content: "hello" }],
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(requestInit?.body)) as { max_tokens: number };

    expect(body.max_tokens).toBe(950);
    expect(body.max_tokens).toBeGreaterThan(350);
  });

  it("falls back to the Sprint 3 default when the env value is invalid or too low", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_CHAT_MAX_TOKENS", "200");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Grounded answer" }],
      }),
    } as Response);

    const client = new AnthropicModelClient();
    await client.generate({
      system: "system",
      messages: [{ role: "user", content: "hello" }],
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(requestInit?.body)) as { max_tokens: number };

    expect(body.max_tokens).toBe(900);
  });

  it("streams assistant text deltas from the Anthropic SSE response", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}\n\n'),
        );
        controller.enqueue(
          encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}\n\n'),
        );
        controller.close();
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const client = new AnthropicModelClient();
    const deltas: string[] = [];

    for await (const delta of client.streamText!({
      system: "system",
      messages: [{ role: "user", content: "hello" }],
    })) {
      deltas.push(delta);
    }

    expect(deltas).toEqual(["Hello ", "world"]);
  });
});