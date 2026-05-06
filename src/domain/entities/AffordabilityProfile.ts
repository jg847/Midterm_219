export type AffordabilityProfile = {
  monthlyIncome: number;
  monthlyHousingCost: number;
};

export function calculateHousingBurden(profile: AffordabilityProfile): number {
  if (profile.monthlyIncome <= 0) return 0;
  return (profile.monthlyHousingCost / profile.monthlyIncome) * 100;
}
