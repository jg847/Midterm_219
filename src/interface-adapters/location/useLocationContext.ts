"use client";

import { useCallback, useState } from "react";

import type { LocationResolveResponse } from "./locationApiClient";
import type { SavedLocationPreference } from "./types";

export type LocationContextState = {
  location: SavedLocationPreference | null;
  baseline: {
    fmrMonthly: number;
    hourlyWageNeededFor30Pct: number;
    locationResolution?: {
      resolvedLabel: string;
      resolutionKind: "exact" | "geocoded" | "state_default_metro" | "fallback_metro" | "national_benchmark";
      usedFallback: boolean;
      fallbackReason?: string;
    };
  } | null;
  policy: {
    minimumWageHourly: number;
    burdenThresholdPct: number;
    notes: string;
  } | null;
};

export function useLocationContextState() {
  const [state, setState] = useState<LocationContextState>({
    location: null,
    baseline: null,
    policy: null,
  });

  const onLocationResolved = useCallback((result: LocationResolveResponse) => {
    if (!result.ok || !result.location) return;

    setState({
      location: result.location,
      baseline: result.baseline
        ? {
            ...result.baseline,
            locationResolution: result.baselineResolution,
          }
        : null,
      policy: result.policy ?? null,
    });
  }, []);

  return {
    ...state,
    onLocationResolved,
  };
}
