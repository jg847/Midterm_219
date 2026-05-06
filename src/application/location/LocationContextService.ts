import type { LocationContext, PolicySnippet } from "@/domain/models/LocationContext";

const stateMinimumWage: Record<string, number> = {
  NJ: 15.13,
  NY: 16,
  CA: 16,
  TX: 7.25,
  FL: 13,
};

export function normalizeLocationContext(input: Partial<LocationContext>): LocationContext {
  return {
    formatted: input.formatted ?? `${input.city ?? "Unknown"}, ${input.state ?? "NA"}`,
    city: input.city ?? "Unknown",
    state: (input.state ?? "NA").toUpperCase(),
    country: input.country ?? "US",
    postalCode: input.postalCode,
    lat: input.lat,
    lng: input.lng,
    radiusMiles: input.radiusMiles && input.radiusMiles > 0 ? input.radiusMiles : 15,
  };
}

export function getPolicySnippet(state: string): PolicySnippet {
  const normalizedState = state.toUpperCase();
  const minimumWageHourly = stateMinimumWage[normalizedState] ?? 7.25;

  return {
    minimumWageHourly,
    burdenThresholdPct: 30,
    notes:
      minimumWageHourly >= 15
        ? "Higher state wage floor, but housing costs may still create burden."
        : "State wage floor is relatively low; housing burden risk is higher.",
  };
}
