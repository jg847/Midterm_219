import type {
  ConversationMessage,
  ConversationRecord,
} from "@/application/ports/ConversationRepository";
import type { ModelClient, ModelMessage } from "@/application/ports/ModelClient";

import type { ChatIntent, ToolExecutionResult } from "./types";

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function digestFirstAnswer(toolResults: ToolExecutionResult[]): { answer: string; citations: string[] } | null {
  const jobDigest = toolResults.find((result) => result.toolName === "job_digest_tool" && result.ok);
  if (jobDigest) {
    const payload = asObject(jobDigest.payload);
    const data = asObject(payload?.data);
    const summaryValue = data?.summary;
    if (typeof summaryValue === "string" && summaryValue.trim()) {
      return {
        answer: summaryValue,
        citations: ["tool:job_digest_tool"],
      };
    }
  }

  const housingDigest = toolResults.find((result) => result.toolName === "housing_digest_tool" && result.ok);
  if (housingDigest) {
    const payload = asObject(housingDigest.payload);
    const data = asObject(payload?.data);
    const summaryValue = data?.summary;
    if (typeof summaryValue === "string" && summaryValue.trim()) {
      return {
        answer: summaryValue,
        citations: ["tool:housing_digest_tool"],
      };
    }
  }

  const uiDigest = toolResults.find((result) => result.toolName === "ui_digest_tool" && result.ok);
  if (uiDigest) {
    const payload = asObject(uiDigest.payload);
    const data = asObject(payload?.data);
    const headline = data?.headline;
    if (typeof headline === "string" && headline.trim()) {
      return {
        answer: headline,
        citations: ["tool:ui_digest_tool"],
      };
    }
  }

  return null;
}

function summarizeToolResults(results: ToolExecutionResult[]): string {
  return results
    .map((result) => `${result.toolName}: ${result.ok ? "ok" : `error(${result.errorCode ?? "unknown"})`}`)
    .join("; ");
}

const MAX_PROMPT_CHAR_BUDGET = 12000;

function toModelMessage(message: ConversationMessage): ModelMessage | null {
  if (message.role !== "user" && message.role !== "assistant") {
    return null;
  }

  return {
    role: message.role,
    content: message.content,
  };
}

function buildCurrentTurnMessage(
  intent: ChatIntent,
  message: string,
  toolResults: ToolExecutionResult[],
  digestSummary?: string,
): ModelMessage {
  const successfulPayloads = toolResults.filter((result) => result.ok).map((result) => result.payload);

  return {
    role: "user",
    content: [
      `Intent: ${intent}`,
      `User question: ${message}`,
      ...(digestSummary ? [`Digest summary: ${digestSummary}`] : []),
      `Tool summary: ${summarizeToolResults(toolResults)}`,
      `Tool payloads (JSON): ${JSON.stringify(successfulPayloads)}`,
      "Respond in concise helpful prose and include short source references where possible.",
    ].join("\n"),
  };
}

export function buildHistoryAwareMessages(
  history: ConversationRecord["messages"],
  currentTurn: ModelMessage,
  maxCharBudget: number = MAX_PROMPT_CHAR_BUDGET,
): ModelMessage[] {
  const modelHistory = history.map(toModelMessage).filter((message): message is ModelMessage => message !== null);
  const retained: ModelMessage[] = [];
  let remainingBudget = Math.max(0, maxCharBudget - currentTurn.content.length);

  for (let index = modelHistory.length - 1; index >= 0; ) {
    const candidate = modelHistory[index];

    if (
      candidate.role === "assistant" &&
      index > 0 &&
      modelHistory[index - 1]?.role === "user"
    ) {
      const pair = [modelHistory[index - 1], candidate];
      const pairLength = pair.reduce((total, message) => total + message.content.length, 0);
      if (pairLength > remainingBudget) {
        break;
      }

      retained.unshift(...pair);
      remainingBudget -= pairLength;
      index -= 2;
      continue;
    }

    if (candidate.role === "user") {
      if (candidate.content.length > remainingBudget) {
        break;
      }

      retained.unshift(candidate);
      remainingBudget -= candidate.content.length;
    }

    index -= 1;
  }

  return [...retained, currentTurn];
}

export async function composeGroundedResponse(
  modelClient: ModelClient,
  intent: ChatIntent,
  message: string,
  history: ConversationRecord["messages"],
  toolResults: ToolExecutionResult[],
): Promise<{ answer: string; citations: string[] }> {
  const digestAnswer = digestFirstAnswer(toolResults);

  const successfulPayloads = toolResults.filter((result) => result.ok).map((result) => result.payload);

  if (!successfulPayloads.length) {
    return {
      answer:
        "I could not retrieve reliable external results right now. Try again in a moment, or ask a narrower question.",
      citations: [],
    };
  }

  const prompt = {
    system:
      "You are Grounded Moves, a practical U.S. housing, jobs, and affordability assistant. Use only provided tool output summary and avoid hallucinations.",
    messages: buildHistoryAwareMessages(
      history,
      buildCurrentTurnMessage(intent, message, toolResults, digestAnswer?.answer),
    ),
  };

  const answer = await modelClient.generate(prompt);

  const citations = toolResults
    .filter((result) => result.ok)
    .map((result) => `tool:${result.toolName}`);

  return { answer, citations };
}
