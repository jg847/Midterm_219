import { describe, expect, it } from "vitest";

import { analyzeBudgetPlan } from "@/domain/entities/BudgetPlan";

describe("budget planning domain", () => {
  it("calculates a structured budget analysis with gross-income fallback disclosure", () => {
    const result = analyzeBudgetPlan({
      grossMonthlyIncome: 5000,
      monthlyHousingCost: 1800,
      utilities: 150,
      transportation: 300,
      food: 450,
    });

    expect(result.verdict).toBe("burdened");
    expect(result.burdenPct).toBe(36);
    expect(result.incomeBasisUsed).toBe("gross");
    expect(result.usedFallbackRule).toBe(true);
    expect(result.fallbackExplanation).toContain("gross income");
  });

  it("uses comparison targets without requiring them to become persisted user facts", () => {
    const result = analyzeBudgetPlan(
      {
        utilities: 150,
        transportation: 200,
      },
      {
        rentMonthly: 1600,
        salaryAnnual: 72000,
        source: "tool_observed",
      },
    );

    expect(result.categoryBreakdown.housing).toBe(1600);
    expect(result.incomeBasisUsed).toBe("gross");
    expect(result.assumptions.some((item) => item.source === "comparison_target")).toBe(true);
  });
});