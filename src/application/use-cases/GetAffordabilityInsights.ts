import {
  calculateHousingBurden,
  type AffordabilityProfile,
} from "@/domain/entities/AffordabilityProfile";

export type AffordabilityInsights = {
  burdenPct: number;
  tier: "safe" | "warning" | "burdened" | "severely-burdened";
};

export function getAffordabilityInsights(
  profile: AffordabilityProfile,
): AffordabilityInsights {
  const burdenPct = Number(calculateHousingBurden(profile).toFixed(2));

  if (burdenPct < 20) return { burdenPct, tier: "safe" };
  if (burdenPct < 30) return { burdenPct, tier: "warning" };
  if (burdenPct < 50) return { burdenPct, tier: "burdened" };
  return { burdenPct, tier: "severely-burdened" };
}
