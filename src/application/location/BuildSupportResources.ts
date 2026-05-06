import type { SupportResourceLink, SupportResourceResolutionSource } from "@/domain/models/SupportResource";

type BuildSupportResourcesInput = {
  city?: string;
  state?: string;
  zipCode?: string;
};

function buildLocationLabel(input: BuildSupportResourcesInput): string {
  if (!input.state) {
    return "United States";
  }

  if (input.zipCode) {
    return `${input.zipCode}, ${input.state}`;
  }

  if (input.city) {
    return `${input.city}, ${input.state}`;
  }

  return input.state;
}

function buildResolutionSource(input: BuildSupportResourcesInput): SupportResourceResolutionSource {
  if (!input.state) {
    return "national_fallback";
  }

  if (input.zipCode) {
    return "zip_exact";
  }

  if (input.city) {
    return "city_exact";
  }

  return "state_fallback";
}

function buildFallbackScope(input: BuildSupportResourcesInput): SupportResourceLink["fallbackScope"] {
  if (!input.state) {
    return "national";
  }

  if (input.zipCode) {
    return "zip";
  }

  if (input.city) {
    return "city";
  }

  return "state";
}

export function buildSupportResources(input: BuildSupportResourcesInput): SupportResourceLink[] {
  const locationLabel = buildLocationLabel(input);
  const resolutionSource = buildResolutionSource(input);
  const fallbackScope = buildFallbackScope(input);
  const encodedLocation = encodeURIComponent(locationLabel);
  const stateLabel = input.state ?? "National";

  return [
    {
      label: `${stateLabel} housing support directory`,
      url: "https://www.hud.gov/states",
      category: "housing_support",
      locationLabel,
      isFallback: resolutionSource === "state_fallback" || resolutionSource === "national_fallback",
      fallbackScope,
      resolutionSource,
      note: input.state
        ? `Start with ${input.state} housing programs and HUD field office contacts for ${locationLabel}.`
        : "Start with national housing directories, then narrow to the state or metro you are comparing.",
    },
    {
      label: "Public housing authority contact finder",
      url: "https://www.hud.gov/program_offices/public_indian_housing/pha/contacts",
      category: "housing_support",
      locationLabel,
      isFallback: resolutionSource === "state_fallback" || resolutionSource === "national_fallback",
      fallbackScope,
      resolutionSource,
      note: input.state
        ? `Check waiting lists, vouchers, and housing authority contacts serving ${locationLabel}.`
        : "Use this national directory to find the housing authority or voucher contact closest to your target market.",
    },
    {
      label: "American Job Center finder",
      url: `https://www.careeronestop.org/LocalHelp/AmericanJobCenters/find-american-job-centers.aspx?location=${encodedLocation}`,
      category: "workforce_support",
      locationLabel,
      isFallback: resolutionSource === "national_fallback",
      fallbackScope: resolutionSource === "national_fallback" ? "national" : undefined,
      resolutionSource,
      note: `Find resume, placement, and training support near ${locationLabel}.`,
    },
    {
      label: "211 community support search",
      url: `https://www.211.org/search?location=${encodedLocation}`,
      category: "community_support",
      locationLabel,
      isFallback: resolutionSource === "national_fallback",
      fallbackScope: resolutionSource === "national_fallback" ? "national" : undefined,
      resolutionSource,
      note: `Search food, utility, housing, and crisis support options near ${locationLabel}.`,
    },
  ];
}