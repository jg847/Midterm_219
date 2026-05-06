import type {
  ChatApiResponse,
  ChatSessionApiResponse,
  ChatResponsePayload,
  ChatStreamEvent,
  ResetChatSessionResponse,
} from "./types";
import type { LocationResolutionKind } from "@/domain/models/LocationContext";

export type SendChatRequest = {
  sessionId: string;
  message: string;
  stream?: boolean;
  location?: {
    formatted: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    radiusMiles: number;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseClarificationState(value: unknown): ChatResponsePayload["clarificationState"] | null {
  if (!isObject(value)) {
    return null;
  }

  return typeof value.ambiguousInput === "string" &&
    typeof value.state === "string" &&
    typeof value.clarificationAsked === "boolean" &&
    typeof value.disclosedFallbackPermitted === "boolean" &&
    typeof value.fallbackMetro === "string"
    ? {
        ambiguousInput: value.ambiguousInput,
        state: value.state,
        clarificationAsked: value.clarificationAsked,
        disclosedFallbackPermitted: value.disclosedFallbackPermitted,
        fallbackMetro: value.fallbackMetro,
      }
    : null;
}

function parseLocationResolution(value: unknown): ChatResponsePayload["toolResults"][number]["locationResolution"] | null {
  if (!isObject(value)) {
    return null;
  }

  return typeof value.resolvedLabel === "string" &&
    typeof value.resolutionKind === "string" &&
    typeof value.usedFallback === "boolean"
    ? {
        resolvedLabel: value.resolvedLabel,
        resolutionKind: value.resolutionKind as LocationResolutionKind,
        usedFallback: value.usedFallback,
        fallbackReason: typeof value.fallbackReason === "string" ? value.fallbackReason : undefined,
      }
    : null;
}

function parseResolvedLocation(value: unknown): ChatResponsePayload["resolvedLocation"] | null {
  if (!isObject(value)) {
    return null;
  }

  return typeof value.formatted === "string" &&
    typeof value.city === "string" &&
    typeof value.state === "string" &&
    typeof value.country === "string" &&
    typeof value.radiusMiles === "number" &&
    typeof value.resolutionKind === "string" &&
    typeof value.resolutionLabel === "string" &&
    typeof value.usedFallback === "boolean"
    ? {
        formatted: value.formatted,
        city: value.city,
        state: value.state,
        country: value.country,
        postalCode: typeof value.postalCode === "string" ? value.postalCode : undefined,
        radiusMiles: value.radiusMiles,
        resolutionKind: value.resolutionKind as NonNullable<ChatResponsePayload["resolvedLocation"]>["resolutionKind"],
        resolutionLabel: value.resolutionLabel,
        usedFallback: value.usedFallback,
        fallbackReason: typeof value.fallbackReason === "string" ? value.fallbackReason : undefined,
        clarificationAsked: typeof value.clarificationAsked === "boolean" ? value.clarificationAsked : undefined,
      }
    : null;
}

function parseToolResult(value: unknown): ChatResponsePayload["toolResults"][number] | null {
  if (!isObject(value)) {
    return null;
  }

  return typeof value.toolName === "string" &&
    typeof value.ok === "boolean" &&
    typeof value.latencyMs === "number"
    ? {
        toolName: value.toolName,
        ok: value.ok,
        latencyMs: value.latencyMs,
        payload: value.payload,
        errorCode: typeof value.errorCode === "string" ? value.errorCode : undefined,
        locationResolution: parseLocationResolution(value.locationResolution) ?? undefined,
      }
    : null;
}

function parseChatResponsePayload(value: unknown): ChatResponsePayload | null {
  if (!isObject(value)) {
    return null;
  }

  const toolResults = Array.isArray(value.toolResults)
    ? value.toolResults.map((result) => parseToolResult(result))
    : null;
  if (toolResults?.some((result) => result === null)) {
    return null;
  }

  return typeof value.sessionId === "string" &&
    typeof value.answer === "string" &&
    typeof value.intent === "string" &&
    isStringArray(value.citations) &&
    Array.isArray(value.toolResults)
    ? {
        sessionId: value.sessionId,
        answer: value.answer,
        intent: value.intent as ChatResponsePayload["intent"],
        citations: value.citations,
        toolResults: (toolResults ?? []) as ChatResponsePayload["toolResults"],
        resolvedLocation: parseResolvedLocation(value.resolvedLocation) ?? undefined,
        clarificationState: parseClarificationState(value.clarificationState) ?? undefined,
        clarificationQuestion: typeof value.clarificationQuestion === "string" ? value.clarificationQuestion : undefined,
      }
    : null;
}

function parseChatStreamEvent(value: unknown): ChatStreamEvent | null {
  if (!isObject(value) || typeof value.type !== "string") {
    return null;
  }

  switch (value.type) {
    case "stream_started":
      return typeof value.sessionId === "string" && (value.mode === "native_tool_use" || value.mode === "fallback_json")
        ? {
            type: "stream_started",
            sessionId: value.sessionId,
            mode: value.mode,
          }
        : null;
    case "tool_status":
      return typeof value.message === "string"
        ? {
            type: "tool_status",
            phase:
              value.phase === "requested" ||
              value.phase === "running" ||
              value.phase === "completed" ||
              value.phase === "failed" ||
              value.phase === "composing"
                ? value.phase
                : "running",
            message: value.message,
            toolName: typeof value.toolName === "string" ? value.toolName : undefined,
            toolUseId: typeof value.toolUseId === "string" ? value.toolUseId : undefined,
            locationLabel: typeof value.locationLabel === "string" ? value.locationLabel : undefined,
            ok: typeof value.ok === "boolean" ? value.ok : undefined,
            errorCode: typeof value.errorCode === "string" ? value.errorCode : undefined,
          }
        : null;
    case "clarification_prompt":
      return typeof value.question === "string" && parseClarificationState(value.clarificationState)
        ? {
            type: "clarification_prompt",
            question: value.question,
            clarificationState: parseClarificationState(value.clarificationState)!,
          }
        : null;
    case "assistant_delta":
      return typeof value.delta === "string" ? { type: "assistant_delta", delta: value.delta } : null;
    case "final_payload":
      return parseChatResponsePayload(value.payload)
        ? {
            type: "final_payload",
            payload: parseChatResponsePayload(value.payload)!,
          }
        : null;
    case "stream_completed":
      return typeof value.persisted === "boolean"
        ? { type: "stream_completed", persisted: value.persisted }
        : null;
    case "stream_error":
      return typeof value.message === "string" && typeof value.retryable === "boolean"
        ? {
            type: "stream_error",
            message: value.message,
            retryable: value.retryable,
            code: typeof value.code === "string" ? value.code : undefined,
          }
        : null;
    default:
      return null;
  }
}

async function* readEventStream(response: Response): AsyncGenerator<ChatStreamEvent, void, void> {
  if (!response.body) {
    yield {
      type: "stream_error",
      message: "Streaming response body was unavailable.",
      retryable: true,
      code: "STREAM_BODY_MISSING",
    };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const dataLines = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter(Boolean);

      if (dataLines.length === 0) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(dataLines.join("\n")) as unknown;
      } catch {
        yield {
          type: "stream_error",
          message: "Received malformed stream data.",
          retryable: true,
          code: "STREAM_MALFORMED_JSON",
        };
        return;
      }

      const event = parseChatStreamEvent(parsed);
      if (!event) {
        yield {
          type: "stream_error",
          message: "Received an unknown or invalid stream event.",
          retryable: true,
          code: "STREAM_INVALID_EVENT",
        };
        return;
      }

      yield event;
    }
  }
}

export async function sendChatMessage(request: SendChatRequest): Promise<ChatApiResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const payload = (await response.json()) as ChatApiResponse;
  if (!response.ok && payload.ok) {
    return { ok: false, error: "Unexpected server response shape" };
  }

  return payload;
}

export async function* streamChatMessage(request: SendChatRequest): AsyncGenerator<ChatStreamEvent, void, void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok) {
    let error = "Streaming chat request failed.";
    try {
      const payload = (await response.json()) as ChatApiResponse;
      if (!payload.ok) {
        error = payload.error;
      }
    } catch {
      error = "Streaming chat request failed.";
    }

    yield {
      type: "stream_error",
      message: error,
      retryable: response.status >= 500 || response.status === 429,
      code: `HTTP_${response.status}`,
    };
    return;
  }

  for await (const event of readEventStream(response)) {
    yield event;
    if (event.type === "stream_error") {
      return;
    }
  }
}

export async function hydrateChatSession(sessionId: string): Promise<ChatSessionApiResponse> {
  const response = await fetch(`/api/chat/session/${sessionId}`, {
    method: "GET",
  });

  const payload = (await response.json()) as ChatSessionApiResponse;
  if (!response.ok && payload.ok) {
    return { ok: false, error: "Unexpected server response shape" };
  }

  return payload;
}

export async function resetChatSession(sessionId: string): Promise<ResetChatSessionResponse> {
  const response = await fetch(`/api/chat/session/${sessionId}`, {
    method: "DELETE",
  });

  const payload = (await response.json()) as ResetChatSessionResponse;
  if (!response.ok && payload.ok) {
    return { ok: false, error: "Unexpected server response shape" };
  }

  return payload;
}
