import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  answerChatQuestionMock,
  answerChatQuestionWithNativeToolUseMock,
  streamChatQuestionWithNativeToolUseMock,
} = vi.hoisted(() => ({
  answerChatQuestionMock: vi.fn(),
  answerChatQuestionWithNativeToolUseMock: vi.fn(),
  streamChatQuestionWithNativeToolUseMock: vi.fn(),
}));

vi.mock("@/application/chat/AnswerChatQuestion", () => ({
  answerChatQuestion: answerChatQuestionMock,
}));

vi.mock("@/application/chat/AnswerChatQuestionWithNativeToolUse", () => ({
  answerChatQuestionWithNativeToolUse: answerChatQuestionWithNativeToolUseMock,
  streamChatQuestionWithNativeToolUse: streamChatQuestionWithNativeToolUseMock,
}));

vi.mock("@/app/api/chat/runtime", () => ({
  getChatRuntime: () => ({
    conversationRepository: {},
    modelClient: {},
    telemetry: { track: vi.fn() },
    toolCatalog: { listTools: () => [] },
    toolExecutor: {},
  }),
}));

import { POST } from "@/app/api/chat/route";

function createStreamingRequest() {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      sessionId: "11111111-1111-4111-8111-111111111111",
      message: "Find jobs in Austin",
      stream: true,
    }),
  });
}

describe("POST /api/chat streaming", () => {
  beforeEach(() => {
    answerChatQuestionMock.mockReset();
    answerChatQuestionWithNativeToolUseMock.mockReset();
    streamChatQuestionWithNativeToolUseMock.mockReset();
    streamChatQuestionWithNativeToolUseMock.mockImplementation(async function* () {
      yield {
        type: "stream_started",
        sessionId: "11111111-1111-4111-8111-111111111111",
        mode: "native_tool_use",
      };
      yield {
        type: "assistant_delta",
        delta: "Hello ",
      };
      yield {
        type: "final_answer_completed",
        text: "Hello world",
        citations: [],
        payload: {
          sessionId: "11111111-1111-4111-8111-111111111111",
          answer: "Hello world",
          intent: "general",
          citations: [],
          toolResults: [],
        },
      };
      yield {
        type: "stream_completed",
        persisted: true,
      };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns SSE events when streaming and native tool use are enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_STREAMING_CHAT", "true");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE", "true");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_CHAT", "false");

    const response = await POST(createStreamingRequest());
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(body).toContain('"type":"stream_started"');
    expect(body).toContain('"type":"assistant_delta"');
    expect(body).toContain('"type":"final_payload"');
    expect(body).toContain('"type":"stream_completed"');
    expect(streamChatQuestionWithNativeToolUseMock).toHaveBeenCalledTimes(1);
    expect(answerChatQuestionWithNativeToolUseMock).not.toHaveBeenCalled();
  });
});