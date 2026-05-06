export type SavedLocationPreference = {
  formatted: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  radiusMiles: number;
  consentGeolocation: boolean;
};
