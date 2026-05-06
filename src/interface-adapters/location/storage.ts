import type { SavedLocationPreference } from "./types";

const STORAGE_KEY = "student-reality-location-pref";

export function readLocationPreference(): SavedLocationPreference | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SavedLocationPreference;
  } catch {
    return null;
  }
}

export function writeLocationPreference(value: SavedLocationPreference): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
