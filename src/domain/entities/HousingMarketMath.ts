export function hourlyWageNeededForHousingBurden(
  monthlyRent: number,
  burdenThresholdPct: number = 30,
): number {
  const ratio = Math.max(1, Math.min(100, burdenThresholdPct)) / 100;
  const annualIncomeNeeded = (monthlyRent / ratio) * 12;
  return Number((annualIncomeNeeded / (52 * 40)).toFixed(2));
}
