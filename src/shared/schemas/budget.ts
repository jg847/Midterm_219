import { z } from "zod";

const BudgetIncomeBasisSchema = z.enum(["gross", "net", "mixed"]);

export const BudgetProfileSchema = z.object({
  grossMonthlyIncome: z.number().nonnegative().optional(),
  netMonthlyIncome: z.number().nonnegative().optional(),
  monthlyHousingCost: z.number().nonnegative().optional(),
  utilities: z.number().nonnegative().optional(),
  transportation: z.number().nonnegative().optional(),
  food: z.number().nonnegative().optional(),
  studentLoans: z.number().nonnegative().optional(),
  creditCardDebt: z.number().nonnegative().optional(),
  otherDebtPayments: z.number().nonnegative().optional(),
  savingsGoal: z.number().nonnegative().optional(),
  discretionary: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

export const BudgetComparisonTargetsSchema = z.object({
  rentMonthly: z.number().nonnegative().optional(),
  salaryAnnual: z.number().nonnegative().optional(),
  source: z.enum(["user", "tool_observed", "tool_estimated"]).optional(),
});

export const BudgetLocationInputSchema = z.object({
  formatted: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2).default("US"),
  radiusMiles: z.number().int().min(1).max(100).default(15),
});

export const BudgetPlanToolInputSchema = z.object({
  profile: BudgetProfileSchema,
  location: BudgetLocationInputSchema.optional(),
  compareAgainst: BudgetComparisonTargetsSchema.optional(),
});

export const BudgetCategoryBreakdownSchema = z.object({
  housing: z.number().nonnegative().optional(),
  utilities: z.number().nonnegative().optional(),
  transportation: z.number().nonnegative().optional(),
  food: z.number().nonnegative().optional(),
  studentLoans: z.number().nonnegative().optional(),
  creditCardDebt: z.number().nonnegative().optional(),
  otherDebtPayments: z.number().nonnegative().optional(),
  savingsGoal: z.number().nonnegative().optional(),
  discretionary: z.number().nonnegative().optional(),
});

export const BudgetAssumptionSchema = z.object({
  field: z.string().min(1),
  source: z.enum(["user", "comparison_target", "omitted", "fallback_rule"]),
  note: z.string().min(1).optional(),
});

export const BudgetPlanToolOutputSchema = z.object({
  verdict: z.enum(["safe", "warning", "burdened", "severely_burdened"]),
  burdenPct: z.number().nonnegative().optional(),
  monthlyNetPosition: z.number(),
  incomeBasisUsed: BudgetIncomeBasisSchema.optional(),
  categoryBreakdown: BudgetCategoryBreakdownSchema,
  missingFields: z.array(z.string()),
  assumptions: z.array(BudgetAssumptionSchema).default([]),
  isPartial: z.boolean().default(false),
  usedFallbackRule: z.boolean().default(false),
  fallbackExplanation: z.string().optional(),
  guidance: z.array(z.string()).min(1),
  locationResolution: z
    .object({
      resolvedLabel: z.string().min(2),
      resolutionKind: z.enum(["exact", "geocoded", "state_default_metro", "fallback_metro", "national_benchmark"]),
      usedFallback: z.boolean(),
      fallbackReason: z.string().optional(),
    })
    .optional(),
});

export type BudgetPlanToolInput = z.infer<typeof BudgetPlanToolInputSchema>;
export type BudgetPlanToolOutput = z.infer<typeof BudgetPlanToolOutputSchema>;
