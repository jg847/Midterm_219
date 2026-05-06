import { analyzeBudgetPlan } from "@/domain/entities/BudgetPlan";
import { BudgetPlanToolInputSchema, type BudgetPlanToolInput, type BudgetPlanToolOutput } from "@/shared/schemas/budget";

import { fail, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";

export const budgetPlanTool: ToolDefinition<BudgetPlanToolInput, BudgetPlanToolOutput> = {
  name: "budget_plan_tool",
  description:
    "Evaluate a user's partial or complete monthly budget for a specific U.S. market. Use this after gathering at least some income, housing, or comparison-target details. The tool returns a verdict, category breakdown, missing fields, assumption disclosures, and location-resolution metadata when location context is provided. Do not use it to persist state; pass the currently known profile and any transient rent or salary comparison targets.",
  inputSchema: BudgetPlanToolInputSchema,
  async execute(input) {
    const hasAnyIncome =
      typeof input.profile.grossMonthlyIncome === "number" ||
      typeof input.profile.netMonthlyIncome === "number" ||
      typeof input.compareAgainst?.salaryAnnual === "number";
    const hasAnyHousing =
      typeof input.profile.monthlyHousingCost === "number" ||
      typeof input.compareAgainst?.rentMonthly === "number";

    if (!hasAnyIncome && !hasAnyHousing) {
      return fail({
        code: "VALIDATION_ERROR",
        message: "Budget analysis needs at least income or housing context to make progress.",
        retryable: false,
      });
    }

    const analysis = analyzeBudgetPlan(input.profile, input.compareAgainst);

    return ok({
      ...analysis,
      locationResolution: input.location
        ? {
            resolvedLabel: input.location.formatted,
            resolutionKind: "exact",
            usedFallback: false,
          }
        : undefined,
    });
  },
};
