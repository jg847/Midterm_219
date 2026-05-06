import type {
  ClarificationState,
  LocationContext,
  LocationResolution,
  ResolvedLocationContext,
} from "@/domain/models/LocationContext";

const STATE_NAMES: Record<string, string> = {
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  FL: "Florida",
  GA: "Georgia",
  IL: "Illinois",
  MA: "Massachusetts",
  NC: "North Carolina",
  NJ: "New Jersey",
  NY: "New York",
  PA: "Pennsylvania",
  TX: "Texas",
  WA: "Washington",
};

const STATE_DEFAULT_METROS: Record<string, { city: string; state: string }> = {
  AZ: { city: "Phoenix", state: "AZ" },
  CA: { city: "Los Angeles", state: "CA" },
  CO: { city: "Denver", state: "CO" },
  FL: { city: "Miami", state: "FL" },
  GA: { city: "Atlanta", state: "GA" },
  IL: { city: "Chicago", state: "IL" },
  MA: { city: "Boston", state: "MA" },
  NC: { city: "Charlotte", state: "NC" },
  NJ: { city: "Newark", state: "NJ" },
  NY: { city: "New York", state: "NY" },
  PA: { city: "Philadelphia", state: "PA" },
  TX: { city: "Houston", state: "TX" },
  WA: { city: "Seattle", state: "WA" },
};

function findStateMatch(message: string): { state: string; label: string } | null {
  const normalized = message.toLowerCase();

  for (const [state, label] of Object.entries(STATE_NAMES)) {
    const abbrPattern = new RegExp(`\\b${state.toLowerCase()}\\b`, "i");
    const namePattern = new RegExp(`\\b${label.toLowerCase()}\\b`, "i");
    if (abbrPattern.test(normalized) || namePattern.test(normalized)) {
      return { state, label };
    }
  }

  return null;
}

function hasExplicitCityOrZip(message: string): boolean {
  return /\b\d{5}(?:-\d{4})?\b/.test(message) || /\b[a-z .'-]+,\s*[A-Z]{2}\b/i.test(message);
}

export function buildResolvedLocationFromInput(location: LocationContext): ResolvedLocationContext {
  return {
    ...location,
    resolutionKind: "exact",
    resolutionLabel: location.formatted,
    usedFallback: false,
  };
}

export function getClarificationState(
  message: string,
  existing?: ClarificationState,
): ClarificationState | null {
  if (hasExplicitCityOrZip(message)) {
    return null;
  }

  const stateMatch = findStateMatch(message);
  if (!stateMatch) {
    return null;
  }

  const fallback = STATE_DEFAULT_METROS[stateMatch.state];
  if (!fallback) {
    return null;
  }

  const normalizedInput = stateMatch.label;
  if (existing && existing.state === stateMatch.state && existing.ambiguousInput === normalizedInput) {
    return {
      ...existing,
      clarificationAsked: true,
      disclosedFallbackPermitted: true,
    };
  }

  return {
    ambiguousInput: normalizedInput,
    state: stateMatch.state,
    clarificationAsked: true,
    disclosedFallbackPermitted: false,
    fallbackMetro: `${fallback.city}, ${fallback.state}`,
  };
}

export function buildClarificationQuestion(state: ClarificationState): string {
  return `Can you narrow that to a city or ZIP in ${state.ambiguousInput}? If not, I can use ${state.fallbackMetro} as a disclosed default.`;
}

export function buildFallbackLocation(state: ClarificationState): ResolvedLocationContext {
  const [city, region] = state.fallbackMetro.split(", ");

  return {
    formatted: state.fallbackMetro,
    city,
    state: region,
    country: "US",
    radiusMiles: 15,
    resolutionKind: "state_default_metro",
    resolutionLabel: state.fallbackMetro,
    usedFallback: true,
    fallbackReason: `User kept the request at the state level after a clarification prompt, so ${state.fallbackMetro} was used as the disclosed default metro for ${state.ambiguousInput}.`,
    clarificationAsked: true,
  };
}

export function normalizeLocationResolution(
  resolvedLocation?: ResolvedLocationContext,
  provided?: LocationResolution,
): LocationResolution | undefined {
  if (provided) {
    return provided;
  }

  if (!resolvedLocation) {
    return undefined;
  }

  return {
    resolvedLabel: resolvedLocation.resolutionLabel,
    resolutionKind: resolvedLocation.resolutionKind,
    usedFallback: resolvedLocation.usedFallback,
    fallbackReason: resolvedLocation.fallbackReason,
  };
}