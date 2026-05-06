import type { AffordabilityInsights } from "@/application/use-cases/GetAffordabilityInsights";

export type AffordabilityViewModel = {
  summary: string;
  color: "green" | "amber" | "red";
};

export function toAffordabilityViewModel(
  insight: AffordabilityInsights,
): AffordabilityViewModel {
  const summary = `${insight.burdenPct.toFixed(2)}% housing burden`;

  if (insight.tier === "safe") return { summary, color: "green" };
  if (insight.tier === "warning") return { summary, color: "amber" };
  return { summary, color: "red" };
}
