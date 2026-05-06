import type {
  BudgetAssumption,
  BudgetCategoryBreakdown,
  BudgetComparisonTargets,
  BudgetIncomeBasis,
  BudgetPlanAnalysis,
  BudgetProfile,
  BudgetVerdictTier,
} from "@/domain/models/BudgetProfile";

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumDefined(values: Array<number | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function resolveIncome(profile: BudgetProfile, comparisonTargets?: BudgetComparisonTargets): {
  monthlyIncome?: number;
  incomeBasisUsed?: BudgetIncomeBasis;
  assumptions: BudgetAssumption[];
} {
  if (typeof profile.netMonthlyIncome === "number" && typeof profile.grossMonthlyIncome === "number") {
    return {
      monthlyIncome: profile.netMonthlyIncome,
      incomeBasisUsed: "mixed",
      assumptions: [
        { field: "netMonthlyIncome", source: "user" },
        {
          field: "grossMonthlyIncome",
          source: "user",
          note: "Gross income was retained for comparison context while net income was used for monthly cash-flow analysis.",
        },
      ],
    };
  }

  if (typeof profile.netMonthlyIncome === "number") {
    return {
      monthlyIncome: profile.netMonthlyIncome,
      incomeBasisUsed: "net",
      assumptions: [{ field: "netMonthlyIncome", source: "user" }],
    };
  }

  if (typeof profile.grossMonthlyIncome === "number") {
    return {
      monthlyIncome: profile.grossMonthlyIncome,
      incomeBasisUsed: "gross",
      assumptions: [{ field: "grossMonthlyIncome", source: "user" }],
    };
  }

  if (typeof comparisonTargets?.salaryAnnual === "number") {
    return {
      monthlyIncome: comparisonTargets.salaryAnnual / 12,
      incomeBasisUsed: "gross",
      assumptions: [
        {
          field: "salaryAnnual",
          source: "comparison_target",
          note: "A comparison salary target was converted to gross monthly income for this analysis.",
        },
      ],
    };
  }

  return { assumptions: [] };
}

function resolveHousingCost(profile: BudgetProfile, comparisonTargets?: BudgetComparisonTargets): {
  housingCost?: number;
  assumptions: BudgetAssumption[];
} {
  if (typeof profile.monthlyHousingCost === "number") {
    return {
      housingCost: profile.monthlyHousingCost,
      assumptions: [{ field: "monthlyHousingCost", source: "user" }],
    };
  }

  if (typeof comparisonTargets?.rentMonthly === "number") {
    return {
      housingCost: comparisonTargets.rentMonthly,
      assumptions: [
        {
          field: "rentMonthly",
          source: "comparison_target",
          note: "A comparison rent target was used for this analysis without changing persisted budget facts.",
        },
      ],
    };
  }

  return { assumptions: [] };
}

function determineVerdict(burdenPct: number | undefined, monthlyNetPosition: number, monthlyIncome?: number): BudgetVerdictTier {
  if (typeof monthlyIncome === "number" && monthlyIncome <= 0) {
    return "severely_burdened";
  }

  if ((burdenPct ?? 0) >= 50) {
    return "severely_burdened";
  }

  if (monthlyNetPosition < 0 || (burdenPct ?? 0) >= 30) {
    return "burdened";
  }

  if (monthlyNetPosition < 250 || (burdenPct ?? 0) >= 20) {
    return "warning";
  }

  return "safe";
}

export function analyzeBudgetPlan(
  profile: BudgetProfile,
  comparisonTargets?: BudgetComparisonTargets,
): BudgetPlanAnalysis {
  const incomeResolution = resolveIncome(profile, comparisonTargets);
  const housingResolution = resolveHousingCost(profile, comparisonTargets);

  const categoryBreakdown: BudgetCategoryBreakdown = {
    housing: housingResolution.housingCost,
    utilities: profile.utilities,
    transportation: profile.transportation,
    food: profile.food,
    studentLoans: profile.studentLoans,
    creditCardDebt: profile.creditCardDebt,
    otherDebtPayments: profile.otherDebtPayments,
    savingsGoal: profile.savingsGoal,
    discretionary: profile.discretionary,
  };

  const monthlyExpenses = sumDefined([
    categoryBreakdown.housing,
    categoryBreakdown.utilities,
    categoryBreakdown.transportation,
    categoryBreakdown.food,
    categoryBreakdown.studentLoans,
    categoryBreakdown.creditCardDebt,
    categoryBreakdown.otherDebtPayments,
    categoryBreakdown.savingsGoal,
    categoryBreakdown.discretionary,
  ]);

  const burdenPct =
    typeof incomeResolution.monthlyIncome === "number" && typeof housingResolution.housingCost === "number" && incomeResolution.monthlyIncome > 0
      ? roundCurrency((housingResolution.housingCost / incomeResolution.monthlyIncome) * 100)
      : undefined;

  const monthlyNetPosition = roundCurrency((incomeResolution.monthlyIncome ?? 0) - monthlyExpenses);

  const missingFields: string[] = [];
  if (typeof incomeResolution.monthlyIncome !== "number") {
    missingFields.push("grossMonthlyIncome_or_netMonthlyIncome");
  }
  if (typeof housingResolution.housingCost !== "number") {
    missingFields.push("monthlyHousingCost");
  }
  if (typeof profile.transportation !== "number") {
    missingFields.push("transportation");
  }
  if (typeof profile.food !== "number") {
    missingFields.push("food");
  }

  const assumptions: BudgetAssumption[] = [
    ...incomeResolution.assumptions,
    ...housingResolution.assumptions,
  ];

  let usedFallbackRule = false;
  let fallbackExplanation: string | undefined;
  if (incomeResolution.incomeBasisUsed === "gross" && typeof profile.netMonthlyIncome !== "number") {
    usedFallbackRule = true;
    fallbackExplanation = "This estimate uses gross income because net monthly income was not provided.";
    assumptions.push({
      field: "incomeBasisUsed",
      source: "fallback_rule",
      note: fallbackExplanation,
    });
  }

  if (missingFields.length > 0 && !fallbackExplanation) {
    usedFallbackRule = true;
    fallbackExplanation = "This is a partial budget estimate because one or more key fields are still missing.";
    assumptions.push({
      field: "missingFields",
      source: "omitted",
      note: fallbackExplanation,
    });
  }

  const verdict = determineVerdict(burdenPct, monthlyNetPosition, incomeResolution.monthlyIncome);
  const isPartial = missingFields.length > 0;

  const guidance: string[] = [];
  if (verdict === "severely_burdened") {
    guidance.push("The current numbers indicate the plan is severely strained and likely unsustainable without major changes.");
  } else if (verdict === "burdened") {
    guidance.push("The current numbers suggest the plan is burdened and would likely require reducing housing or other recurring costs.");
  } else if (verdict === "warning") {
    guidance.push("The current numbers are tight enough that a change in rent, income, or debt could make this plan unstable.");
  } else {
    guidance.push("The current numbers suggest the plan is workable if the income and expense assumptions hold.");
  }

  if (missingFields.includes("grossMonthlyIncome_or_netMonthlyIncome")) {
    guidance.push("Add gross or net monthly income to produce a more reliable affordability verdict.");
  }
  if (missingFields.includes("monthlyHousingCost")) {
    guidance.push("Add a target housing cost or rent to compare this budget against a real monthly payment.");
  }
  if (missingFields.includes("transportation") || missingFields.includes("food")) {
    guidance.push("Transportation and food costs will make this budget more realistic once they are included.");
  }

  return {
    verdict,
    burdenPct,
    monthlyNetPosition,
    incomeBasisUsed: incomeResolution.incomeBasisUsed,
    categoryBreakdown,
    missingFields,
    assumptions,
    isPartial,
    usedFallbackRule,
    fallbackExplanation,
    guidance,
  };
}
