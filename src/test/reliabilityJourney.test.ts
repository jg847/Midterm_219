import { describe, expect, it, vi } from "vitest";

import { answerChatQuestion } from "@/application/chat/AnswerChatQuestion";
import type {
  ConversationRecord,
  ConversationRepository,
} from "@/application/ports/ConversationRepository";
import type { ModelClient } from "@/application/ports/ModelClient";
import type { TelemetryPort } from "@/application/ports/TelemetryPort";
import type { ToolExecutor } from "@/application/ports/ToolExecutor";

class InMemoryRepo implements ConversationRepository {
  private value: ConversationRecord | null = null;
  async getSession() {
    return this.value;
  }
  async saveSession(record: ConversationRecord) {
    this.value = record;
  }
  async deleteSession() {
    this.value = null;
  }
}

class FastModel implements ModelClient {
  async generate() {
    return "Actionable answer";
  }
}

class SilentTelemetry implements TelemetryPort {
  track() {}
}

describe("reliability journey", () => {
  it("completes location-aware chat flow under latency budget with deterministic tool output", async () => {
    const toolExecutor: ToolExecutor = {
      execute: vi.fn(async () => ({ ok: true, data: { status: "ok" } })),
    };

    const startedAt = Date.now();
    const result = await answerChatQuestion(
      {
        sessionId: "journey-1",
        message: "find jobs near me",
        location: {
          formatted: "Austin, TX",
          city: "Austin",
          state: "TX",
          country: "US",
          radiusMiles: 15,
        },
      },
      {
        conversationRepository: new InMemoryRepo(),
        modelClient: new FastModel(),
        telemetry: new SilentTelemetry(),
        toolExecutor,
      },
    );
    const elapsedMs = Date.now() - startedAt;

    expect(result.answer).toBe("Actionable answer");
    expect(result.toolResults.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(500);
  });

  it("maps provider timeout-like errors into retryable tool failure", async () => {
    const timeoutExecutor: ToolExecutor = {
      execute: vi.fn(async () => ({
        ok: false,
        error: { code: "UPSTREAM_ERROR" },
      })),
    };

    const result = await answerChatQuestion(
      {
        sessionId: "journey-timeout",
        message: "find apartments",
      },
      {
        conversationRepository: new InMemoryRepo(),
        modelClient: new FastModel(),
        telemetry: new SilentTelemetry(),
        toolExecutor: timeoutExecutor,
      },
    );

    expect(result.toolResults.some((item) => item.ok === false)).toBe(true);
  });
});
