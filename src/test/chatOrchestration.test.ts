import { describe, expect, it } from "vitest";

import { answerChatQuestion } from "@/application/chat/AnswerChatQuestion";
import type {
  ConversationRecord,
  ConversationRepository,
} from "@/application/ports/ConversationRepository";
import type { ModelClient, ModelPrompt } from "@/application/ports/ModelClient";
import type { TelemetryPort } from "@/application/ports/TelemetryPort";
import type { ToolExecutor } from "@/application/ports/ToolExecutor";

class FakeRepo implements ConversationRepository {
  constructor(private value: ConversationRecord | null = null) {}

  async getSession(sessionId: string): Promise<ConversationRecord | null> {
    if (!this.value || this.value.sessionId !== sessionId) {
      return null;
    }

    return this.value;
  }

  async saveSession(record: ConversationRecord): Promise<void> {
    this.value = record;
  }

  async deleteSession(): Promise<void> {
    this.value = null;
  }
}

class FakeModel implements ModelClient {
  public prompts: ModelPrompt[] = [];

  async generate(prompt: ModelPrompt): Promise<string> {
    this.prompts.push(prompt);
    return "Grounded response";
  }
}

class FakeTelemetry implements TelemetryPort {
  public events: string[] = [];
  track(event: { name: string }): void {
    this.events.push(event.name);
  }
}

class FakeToolExecutor implements ToolExecutor {
  async execute(toolName: string): Promise<{ ok: true; data: Record<string, unknown> }> {
    if (toolName === "ui_digest_tool") {
      return {
        ok: true,
        data: {
          headline: "Digest headline",
        },
      };
    }

    return { ok: true, data: { value: "ok" } };
  }
}

describe("answerChatQuestion", () => {
  it("classifies intent, runs tools, composes answer, and loads prior session history into model messages", async () => {
    const repo = new FakeRepo({
      sessionId: "s1",
      messages: [
        { role: "user", content: "Earlier question", createdAt: "2026-05-01T10:00:00.000Z" },
        { role: "assistant", content: "Earlier answer", createdAt: "2026-05-01T10:00:01.000Z" },
      ],
      traces: [],
    });
    const model = new FakeModel();
    const telemetry = new FakeTelemetry();
    const toolExecutor = new FakeToolExecutor();

    const result = await answerChatQuestion(
      { sessionId: "s1", message: "What does the story say about rent burden?" },
      {
        conversationRepository: repo,
        modelClient: model,
        telemetry,
        toolExecutor,
      },
    );

    expect(result.sessionId).toBe("s1");
    expect(result.intent).toBe("story_data");
    expect(result.answer).toBe("Grounded response");
    expect(result.toolResults.length).toBeGreaterThan(0);
    expect(model.prompts).toHaveLength(1);
    expect(model.prompts[0]?.messages.some((message) => message.content.includes("Earlier question"))).toBe(true);
    expect(model.prompts[0]?.messages.at(-1)?.content).toContain(
      "User question: What does the story say about rent burden?",
    );
    expect(telemetry.events).toContain("chat.intent.classified");
    expect(telemetry.events).toContain("chat.tool.executed");
    expect(telemetry.events).toContain("chat.session.loaded");
  });

  it("still calls the model for digest-backed affordability turns so prior history is preserved", async () => {
    const repo = new FakeRepo({
      sessionId: "s2",
      messages: [
        { role: "user", content: "Earlier affordability question", createdAt: "2026-05-01T10:00:00.000Z" },
        { role: "assistant", content: "Earlier affordability answer", createdAt: "2026-05-01T10:00:01.000Z" },
      ],
      traces: [],
    });
    const model = new FakeModel();

    const result = await answerChatQuestion(
      { sessionId: "s2", message: "Compare job pay vs rent burden in this location" },
      {
        conversationRepository: repo,
        modelClient: model,
        telemetry: new FakeTelemetry(),
        toolExecutor: new FakeToolExecutor(),
      },
    );

    expect(result.intent).toBe("affordability");
    expect(model.prompts).toHaveLength(1);
    expect(model.prompts[0]?.messages.some((promptMessage) => promptMessage.content.includes("Earlier affordability question"))).toBe(true);
    expect(model.prompts[0]?.messages.at(-1)?.content).toContain("Digest summary: Digest headline");
  });
});
