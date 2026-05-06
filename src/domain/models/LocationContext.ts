export type LocationContext = {
  formatted: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  radiusMiles: number;
};

export type LocationResolutionKind =
  | "exact"
  | "geocoded"
  | "state_default_metro"
  | "fallback_metro"
  | "national_benchmark";

export type LocationResolution = {
  resolvedLabel: string;
  resolutionKind: LocationResolutionKind;
  usedFallback: boolean;
  fallbackReason?: string;
};

export type ResolvedLocationContext = LocationContext & {
  resolutionKind: LocationResolutionKind;
  resolutionLabel: string;
  usedFallback: boolean;
  fallbackReason?: string;
  clarificationAsked?: boolean;
};

export type ClarificationState = {
  ambiguousInput: string;
  state: string;
  clarificationAsked: boolean;
  disclosedFallbackPermitted: boolean;
  fallbackMetro: string;
};

export type PolicySnippet = {
  minimumWageHourly: number;
  burdenThresholdPct: number;
  notes: string;
};
