import { describe, expect, it } from "vitest";

import type { ConversationRecord } from "@/application/ports/ConversationRepository";
import type { ChatResponsePayload } from "@/interface-adapters/chat/types";

describe("Sprint 3 chat contracts", () => {
  it("allows conversation records to persist clarification state", () => {
    const record: ConversationRecord = {
      sessionId: "s1",
      messages: [],
      traces: [],
      clarificationState: {
        ambiguousInput: "Texas",
        state: "TX",
        clarificationAsked: true,
        disclosedFallbackPermitted: true,
        fallbackMetro: "Houston, TX",
      },
    };

    expect(record.clarificationState?.fallbackMetro).toBe("Houston, TX");
  });

  it("allows chat payloads to return location-resolution and clarification metadata", () => {
    const payload: ChatResponsePayload = {
      sessionId: "s1",
      answer: "Can you narrow it to a city or ZIP in Texas?",
      intent: "housing",
      citations: [],
      toolResults: [],
      clarificationQuestion: "Can you narrow it to a city or ZIP in Texas?",
      clarificationState: {
        ambiguousInput: "Texas",
        state: "TX",
        clarificationAsked: true,
        disclosedFallbackPermitted: false,
        fallbackMetro: "Houston, TX",
      },
    };

    expect(payload.clarificationState?.state).toBe("TX");
    expect(payload.clarificationQuestion).toContain("Texas");
  });
});