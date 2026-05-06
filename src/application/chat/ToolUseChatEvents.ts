import type { ClarificationState, LocationResolution } from "@/domain/models/LocationContext";
import type { ChatResponsePayload } from "@/application/chat/types";

export type ToolUseChatEvent =
  | {
      type: "stream_started";
      sessionId: string;
      mode: "native_tool_use" | "fallback_json";
    }
  | {
      type: "assistant_message";
      text: string;
    }
  | {
      type: "assistant_delta";
      delta: string;
    }
  | {
      type: "tool_request";
      toolName: string;
      toolUseId: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      toolName: string;
      toolUseId: string;
      ok: boolean;
      errorCode?: string;
      locationResolution?: LocationResolution;
    }
  | {
      type: "clarification_prompt";
      question: string;
      clarificationState: ClarificationState;
    }
  | {
      type: "final_answer_completed";
      text: string;
      citations: string[];
      payload?: ChatResponsePayload;
    }
  | {
      type: "stream_error";
      message: string;
      retryable: boolean;
      code?: string;
    }
  | {
      type: "stream_completed";
      persisted: boolean;
    };