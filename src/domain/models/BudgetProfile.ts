export type BudgetIncomeBasis = "gross" | "net" | "mixed";

export type BudgetVerdictTier = "safe" | "warning" | "burdened" | "severely_burdened";

export type BudgetCategoryBreakdown = {
  housing?: number;
  utilities?: number;
  transportation?: number;
  food?: number;
  studentLoans?: number;
  creditCardDebt?: number;
  otherDebtPayments?: number;
  savingsGoal?: number;
  discretionary?: number;
};

export type BudgetProfile = {
  grossMonthlyIncome?: number;
  netMonthlyIncome?: number;
  monthlyHousingCost?: number;
  utilities?: number;
  transportation?: number;
  food?: number;
  studentLoans?: number;
  creditCardDebt?: number;
  otherDebtPayments?: number;
  savingsGoal?: number;
  discretionary?: number;
  notes?: string;
};

export type BudgetComparisonTargetSource = "user" | "tool_observed" | "tool_estimated";

export type BudgetComparisonTargets = {
  rentMonthly?: number;
  salaryAnnual?: number;
  source?: BudgetComparisonTargetSource;
};

export type BudgetAssumptionSource = "user" | "comparison_target" | "omitted" | "fallback_rule";

export type BudgetAssumption = {
  field: string;
  source: BudgetAssumptionSource;
  note?: string;
};

export type BudgetPlanAnalysis = {
  verdict: BudgetVerdictTier;
  burdenPct?: number;
  monthlyNetPosition: number;
  incomeBasisUsed?: BudgetIncomeBasis;
  categoryBreakdown: BudgetCategoryBreakdown;
  missingFields: string[];
  assumptions: BudgetAssumption[];
  isPartial: boolean;
  usedFallbackRule: boolean;
  fallbackExplanation?: string;
  guidance: string[];
};

export type PersistedBudgetState = {
  profile: BudgetProfile;
  missingFields: string[];
  lastUpdatedAt: string;
  analysisReady: boolean;
};
