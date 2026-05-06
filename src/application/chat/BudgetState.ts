import type { PersistedBudgetState, BudgetProfile } from "@/domain/models/BudgetProfile";
import type { BudgetPlanToolInput, BudgetPlanToolOutput } from "@/shared/schemas/budget";

function mergeBudgetProfile(existing: BudgetProfile, incoming: BudgetProfile): BudgetProfile {
  return {
    grossMonthlyIncome: incoming.grossMonthlyIncome ?? existing.grossMonthlyIncome,
    netMonthlyIncome: incoming.netMonthlyIncome ?? existing.netMonthlyIncome,
    monthlyHousingCost: incoming.monthlyHousingCost ?? existing.monthlyHousingCost,
    utilities: incoming.utilities ?? existing.utilities,
    transportation: incoming.transportation ?? existing.transportation,
    food: incoming.food ?? existing.food,
    studentLoans: incoming.studentLoans ?? existing.studentLoans,
    creditCardDebt: incoming.creditCardDebt ?? existing.creditCardDebt,
    otherDebtPayments: incoming.otherDebtPayments ?? existing.otherDebtPayments,
    savingsGoal: incoming.savingsGoal ?? existing.savingsGoal,
    discretionary: incoming.discretionary ?? existing.discretionary,
    notes: incoming.notes ?? existing.notes,
  };
}

export function mergePersistedBudgetState(
  existing: PersistedBudgetState | undefined,
  toolInput: BudgetPlanToolInput,
  toolOutput: BudgetPlanToolOutput | undefined,
  now: string,
): PersistedBudgetState {
  const profile = mergeBudgetProfile(existing?.profile ?? {}, toolInput.profile);

  return {
    profile,
    missingFields: toolOutput?.missingFields ?? existing?.missingFields ?? [],
    lastUpdatedAt: now,
    analysisReady: toolOutput ? !toolOutput.isPartial : existing?.analysisReady ?? false,
  };
}

export function formatBudgetStateForPrompt(budgetState?: PersistedBudgetState): string | null {
  if (!budgetState) {
    return null;
  }

  const hasFacts = Object.values(budgetState.profile).some((value) => value !== undefined && value !== "");
  if (!hasFacts) {
    return null;
  }

  return JSON.stringify({
    profile: budgetState.profile,
    missingFields: budgetState.missingFields,
    analysisReady: budgetState.analysisReady,
  });
}
