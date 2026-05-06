import { describe, expect, it } from "vitest";
import { calculateHousingBurden } from "@/domain/entities/AffordabilityProfile";
import { getAffordabilityInsights } from "@/application/use-cases/GetAffordabilityInsights";

describe("affordability domain and use-case", () => {
  it("calculates burden percentage", () => {
    expect(
      calculateHousingBurden({ monthlyIncome: 4000, monthlyHousingCost: 1400 }),
    ).toBe(35);
  });

  it("maps burden tiers from use case", () => {
    const result = getAffordabilityInsights({
      monthlyIncome: 4000,
      monthlyHousingCost: 1400,
    });

    expect(result).toEqual({ burdenPct: 35, tier: "burdened" });
  });
});
