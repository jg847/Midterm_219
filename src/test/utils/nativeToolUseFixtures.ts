import type { ConversationRecord } from "@/application/ports/ConversationRepository";
import type { PersistedBudgetState } from "@/domain/models/BudgetProfile";
import type { ClarificationState } from "@/domain/models/LocationContext";

export const AMBIGUOUS_STATE_REQUEST = "Show me rentals in Texas";
export const DISCLOSED_FALLBACK_METRO = "Houston, TX";
export const CLARIFICATION_QUESTION =
  "Can you narrow that to a city or ZIP in Texas? If not, I can use Houston, TX as a disclosed default.";
export const DISCLOSED_FALLBACK_LOCATION_NOTE =
  "User kept the request at the state level after a clarification prompt, so Houston, TX was used as the disclosed default metro for Texas.";

export function buildClarificationStateFixture(
  overrides: Partial<ClarificationState> = {},
): ClarificationState {
  return {
    ambiguousInput: "Texas",
    state: "TX",
    clarificationAsked: true,
    disclosedFallbackPermitted: false,
    fallbackMetro: DISCLOSED_FALLBACK_METRO,
    ...overrides,
  };
}

export function buildConversationRecordFixture(
  overrides: Partial<ConversationRecord> & Pick<ConversationRecord, "sessionId">,
): ConversationRecord {
  return {
    sessionId: overrides.sessionId,
    messages: overrides.messages ?? [],
    traces: overrides.traces ?? [],
    clarificationState: overrides.clarificationState,
    budgetState: overrides.budgetState,
    lastActivityAt: overrides.lastActivityAt,
    expiresAt: overrides.expiresAt,
  };
}

export function buildBudgetStateFixture(
  overrides: Partial<PersistedBudgetState> = {},
): PersistedBudgetState {
  return {
    profile: {
      grossMonthlyIncome: 5000,
      monthlyHousingCost: 1800,
      utilities: 150,
    },
    missingFields: ["netMonthlyIncome"],
    lastUpdatedAt: "2026-05-05T00:00:00.000Z",
    analysisReady: false,
    ...overrides,
  };
}