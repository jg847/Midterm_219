import type { ClarificationState } from "@/domain/models/LocationContext";
import type { PersistedBudgetState } from "@/domain/models/BudgetProfile";

export type ChatRole = "user" | "assistant" | "tool";

export type ConversationArtifact =
  | {
      type: "citation_list";
      citations: string[];
    }
  | {
      type: "tool_result";
      toolName: string;
      payload: unknown;
      ok: boolean;
      latencyMs: number;
      errorCode?: string;
    }
  | {
      type: "trace_summary";
      summary: string;
    };

export type ConversationMessage = {
  role: ChatRole;
  content: string;
  createdAt: string;
  artifacts?: ConversationArtifact[];
};

export type ToolTrace = {
  toolName: string;
  latencyMs: number;
  ok: boolean;
  errorCode?: string;
};

export type ConversationRecord = {
  sessionId: string;
  messages: ConversationMessage[];
  traces: ToolTrace[];
  clarificationState?: ClarificationState;
  budgetState?: PersistedBudgetState;
  lastActivityAt?: string;
  expiresAt?: string;
};

export interface ConversationRepository {
  getSession(sessionId: string): Promise<ConversationRecord | null>;
  saveSession(record: ConversationRecord): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
}
