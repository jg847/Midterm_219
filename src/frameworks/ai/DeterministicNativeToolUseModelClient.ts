import type {
  ModelClient,
  ModelPrompt,
  StreamTextPrompt,
  ToolUseModelMessage,
  ToolUseModelPrompt,
  ToolUseModelResponse,
} from "@/application/ports/ModelClient";

const DEFAULT_LOCATION = "Houston, TX";

function getLatestUserText(messages: ToolUseModelMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }

    return message.content
      .filter((block): block is Extract<ToolUseModelMessage["content"][number], { type: "text" }> => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }

  return "";
}

function extractResolvedLocation(text: string): string {
  const matches = Array.from(text.matchAll(/([A-Za-z .'-]+,\s*[A-Z]{2})/g));
  return matches.at(-1)?.[1]?.trim() ?? DEFAULT_LOCATION;
}

function hasToolResult(messages: ToolUseModelMessage[]): boolean {
  return messages.some((message) => message.content.some((block) => block.type === "tool_result"));
}

export class DeterministicNativeToolUseModelClient implements ModelClient {
  async generate(prompt: ModelPrompt): Promise<string> {
    void prompt;
    return "Deterministic native tool use response.";
  }

  async generateToolUse(prompt: ToolUseModelPrompt): Promise<ToolUseModelResponse> {
    const latestUserText = getLatestUserText(prompt.messages);
    const location = extractResolvedLocation(latestUserText);

    if (hasToolResult(prompt.messages)) {
      return {
        type: "assistant_message",
        stopReason: "end_turn",
        message: `I used ${location} as the disclosed market and pulled a grounded housing baseline to summarize the rental outlook.`,
      };
    }

    return {
      type: "tool_calls",
      stopReason: "tool_use",
      toolCalls: [
        {
          id: "deterministic-housing-market-1",
          toolName: "housing_market_tool",
          input: {
            location,
            bedroomCount: 1,
          },
        },
      ],
    };
  }

  async *streamText(prompt: StreamTextPrompt): AsyncIterable<string> {
    void prompt;
    yield "Using the grounded housing baseline, ";
    yield "here are the recommended next steps.";
  }
}