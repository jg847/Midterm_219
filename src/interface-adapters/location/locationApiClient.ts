import type { SavedLocationPreference } from "./types";

export type LocationResolveResponse = {
  ok: boolean;
  location?: SavedLocationPreference;
  policy?: {
    minimumWageHourly: number;
    burdenThresholdPct: number;
    notes: string;
  };
  baseline?: {
    fmrMonthly: number;
    hourlyWageNeededFor30Pct: number;
  };
  baselineResolution?: {
    resolvedLabel: string;
    resolutionKind: "exact" | "geocoded" | "state_default_metro" | "fallback_metro" | "national_benchmark";
    usedFallback: boolean;
    fallbackReason?: string;
  };
  error?: string;
};

export async function resolveLocationContext(input: {
  query?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
}): Promise<LocationResolveResponse> {
  const response = await fetch("/api/location/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return (await response.json()) as LocationResolveResponse;
}
