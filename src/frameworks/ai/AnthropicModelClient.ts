import type {
  ModelClient,
  ModelPrompt,
  StreamTextPrompt,
  ToolUseModelPrompt,
  ToolUseModelResponse,
} from "@/application/ports/ModelClient";
import { getChatResponseMaxTokens } from "@/shared/config/chatRuntime";

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

type AnthropicResponsePayload = {
  content?: AnthropicContentBlock[];
  stop_reason?: "tool_use" | "end_turn" | "stop_sequence" | "max_tokens";
};

type AnthropicStreamEvent = {
  type?: string;
  delta?: {
    type?: string;
    text?: string;
  };
  error?: {
    message?: string;
  };
};

function getConfiguredModels(): string[] {
  const configuredModel = process.env.ANTHROPIC_MODEL?.trim();
  const fallbackModels = [
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
  ];

  return configuredModel
    ? [configuredModel, ...fallbackModels.filter((model) => model !== configuredModel)]
    : fallbackModels;
}

async function postToAnthropic(
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal },
): Promise<AnthropicResponsePayload | string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const modelsToTry = getConfiguredModels();

  if (!apiKey) {
    return "Anthropic key is missing. Add ANTHROPIC_API_KEY to continue.";
  }

  let lastStatus: number | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: options?.signal,
        body: JSON.stringify({
          model,
          ...body,
        }),
      });

      if (!response.ok) {
        lastStatus = response.status;
        if (response.status === 404) {
          continue;
        }

        return `Model request failed (${response.status}).`;
      }

      return (await response.json()) as AnthropicResponsePayload;
    } catch {
      return "Model is temporarily unavailable.";
    }
  }

  if (lastStatus === 404) {
    return "Configured model was not found. Set ANTHROPIC_MODEL to a valid model ID.";
  }

  return "Model is temporarily unavailable.";
}

async function* streamFromAnthropic(
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal },
): AsyncGenerator<string, void, void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const modelsToTry = getConfiguredModels();

  if (!apiKey) {
    yield "Anthropic key is missing. Add ANTHROPIC_API_KEY to continue.";
    return;
  }

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: options?.signal,
        body: JSON.stringify({
          model,
          stream: true,
          ...body,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          continue;
        }

        yield `Model request failed (${response.status}).`;
        return;
      }

      if (!response.body) {
        yield "Model is temporarily unavailable.";
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

          const data = dataLines.join("\n");
          if (data === "[DONE]") {
            return;
          }

          const event = JSON.parse(data) as AnthropicStreamEvent;
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && typeof event.delta.text === "string") {
            yield event.delta.text;
          }

          if (event.type === "error") {
            yield event.error?.message ?? "Model is temporarily unavailable.";
            return;
          }
        }
      }

      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      yield "Model is temporarily unavailable.";
      return;
    }
  }

  yield "Configured model was not found. Set ANTHROPIC_MODEL to a valid model ID.";
}

export class AnthropicModelClient implements ModelClient {
  async generate(prompt: ModelPrompt, options?: { signal?: AbortSignal }): Promise<string> {
    const payload = await postToAnthropic({
      max_tokens: getChatResponseMaxTokens(),
      system: prompt.system,
      messages: prompt.messages.map((message) => ({
        role: message.role,
        content: [{ type: "text", text: message.content }],
      })),
    }, options);

    if (typeof payload === "string") {
      return payload;
    }

    const text = payload.content?.find((part) => part.type === "text")?.text;
    return text ?? "No model response available.";
  }

  async generateToolUse(prompt: ToolUseModelPrompt, options?: { signal?: AbortSignal }): Promise<ToolUseModelResponse> {
    const payload = await postToAnthropic({
      max_tokens: prompt.maxTokens ?? getChatResponseMaxTokens(),
      system: prompt.system,
      tools: prompt.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      })),
      messages: prompt.messages.map((message) => ({
        role: message.role,
        content: message.content.map((block) => {
          if (block.type === "tool_result") {
            return {
              type: "tool_result",
              tool_use_id: block.toolUseId,
              is_error: block.isError ?? false,
              content: [{ type: "text", text: block.content }],
            };
          }

          if (block.type === "tool_use") {
            return {
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: block.input,
            };
          }

          return block;
        }),
      })),
    }, options);

    if (typeof payload === "string") {
      return {
        type: "assistant_message",
        message: payload,
        stopReason: "end_turn",
      };
    }

    const toolCalls = (payload.content ?? [])
      .filter((part): part is Extract<AnthropicContentBlock, { type: "tool_use" }> => part.type === "tool_use")
      .map((part) => ({
        id: part.id,
        toolName: part.name,
        input: part.input,
      }));
    const assistantText = (payload.content ?? [])
      .filter((part): part is Extract<AnthropicContentBlock, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (toolCalls.length > 0) {
      return {
        type: "tool_calls",
        toolCalls,
        stopReason: "tool_use",
        assistantMessage: assistantText || undefined,
      };
    }

    return {
      type: "assistant_message",
      message: assistantText || "No model response available.",
      stopReason: payload.stop_reason === "tool_use" ? "end_turn" : (payload.stop_reason ?? "end_turn"),
    };
  }

  async *streamText(prompt: StreamTextPrompt, options?: { signal?: AbortSignal }): AsyncIterable<string> {
    yield* streamFromAnthropic(
      {
        max_tokens: prompt.maxTokens ?? getChatResponseMaxTokens(),
        system: prompt.system,
        messages: prompt.messages.map((message) => ({
          role: message.role,
          content: [{ type: "text", text: message.content }],
        })),
      },
      options,
    );
  }
}
