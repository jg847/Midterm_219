import type { ConversationArtifact } from "@/application/ports/ConversationRepository";
import type { PersistedBudgetState } from "@/domain/models/BudgetProfile";
import type {
  ClarificationState,
  LocationResolution,
  ResolvedLocationContext,
} from "@/domain/models/LocationContext";

export type ChatToolResult = {
  toolName: string;
  ok: boolean;
  latencyMs: number;
  payload: unknown;
  errorCode?: string;
  locationResolution?: LocationResolution;
};

export type ChatTranscriptMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
  artifacts?: ConversationArtifact[];
};

export type ChatResponsePayload = {
  sessionId: string;
  answer: string;
  intent: "story_data" | "affordability" | "jobs" | "housing" | "location" | "general";
  toolResults: ChatToolResult[];
  citations: string[];
  resolvedLocation?: ResolvedLocationContext;
  clarificationState?: ClarificationState;
  clarificationQuestion?: string;
};

export type ChatApiResponse =
  | { ok: true; payload: ChatResponsePayload }
  | { ok: false; error: string; issues?: unknown };

export type ChatStreamMode = "native_tool_use" | "fallback_json";

export type ChatStreamStartEvent = {
  type: "stream_started";
  sessionId: string;
  mode: ChatStreamMode;
};

export type ChatToolStatusPhase = "requested" | "running" | "completed" | "failed" | "composing";

export type ChatToolStatusEvent = {
  type: "tool_status";
  phase: ChatToolStatusPhase;
  message: string;
  toolName?: string;
  toolUseId?: string;
  locationLabel?: string;
  ok?: boolean;
  errorCode?: string;
};

export type ChatClarificationPromptEvent = {
  type: "clarification_prompt";
  question: string;
  clarificationState: ClarificationState;
};

export type ChatAssistantDeltaEvent = {
  type: "assistant_delta";
  delta: string;
};

export type ChatFinalPayloadEvent = {
  type: "final_payload";
  payload: ChatResponsePayload;
};

export type ChatStreamCompletedEvent = {
  type: "stream_completed";
  persisted: boolean;
};

export type ChatStreamErrorEvent = {
  type: "stream_error";
  message: string;
  retryable: boolean;
  code?: string;
};

export type ChatStreamEvent =
  | ChatStreamStartEvent
  | ChatToolStatusEvent
  | ChatClarificationPromptEvent
  | ChatAssistantDeltaEvent
  | ChatFinalPayloadEvent
  | ChatStreamCompletedEvent
  | ChatStreamErrorEvent;

export type ChatSessionPayload = {
  sessionId: string;
  messages: ChatTranscriptMessage[];
  clarificationState?: ClarificationState;
  budgetState?: PersistedBudgetState;
  resetRecommended?: boolean;
};

export type ChatSessionApiResponse =
  | { ok: true; payload: ChatSessionPayload }
  | { ok: false; error: string };

export type ResetChatSessionResponse = { ok: true } | { ok: false; error: string };
