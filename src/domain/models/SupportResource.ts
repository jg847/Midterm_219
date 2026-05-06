export type SupportResourceCategory =
  | "housing_support"
  | "workforce_support"
  | "community_support"
  | "general_reference";

export type SupportResourceResolutionSource =
  | "zip_exact"
  | "city_exact"
  | "metro_match"
  | "state_fallback"
  | "national_fallback";

export type SupportResourceLink = {
  label: string;
  url: string;
  category: SupportResourceCategory;
  locationLabel?: string;
  isFallback: boolean;
  fallbackScope?: "zip" | "city" | "metro" | "state" | "national";
  note?: string;
  resolutionSource?: SupportResourceResolutionSource;
};