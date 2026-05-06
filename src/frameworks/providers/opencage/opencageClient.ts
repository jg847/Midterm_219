import { guardedFetch } from "@/frameworks/providers/http/guardedFetch";

export type NormalizedLocation = {
  formatted: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  lat: number;
  lng: number;
};

export async function lookupLocation(query: string): Promise<NormalizedLocation | null> {
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) throw new Error("Missing OPENCAGE_API_KEY");

  const endpoint = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}&limit=1`;

  const payload = (await guardedFetch({
    cacheKey: `opencage:${query}`,
    rateLimitKey: "opencage",
    cacheTtlMs: 3 * 60_000,
    request: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`OpenCage failed with status ${response.status}`);
      return response.json();
    },
  })) as { results?: Array<Record<string, unknown>> };

  const first = payload.results?.[0] as
    | { formatted?: string; geometry?: { lat?: number; lng?: number }; components?: Record<string, string> }
    | undefined;

  if (!first?.geometry?.lat || !first.geometry.lng) return null;

  const city = first.components?.city || first.components?.town || first.components?.village || "Unknown";
  const state = first.components?.state_code || first.components?.state || "NA";

  return {
    formatted: first.formatted ?? query,
    city,
    state,
    country: first.components?.country || "Unknown",
    postalCode: first.components?.postcode,
    lat: first.geometry.lat,
    lng: first.geometry.lng,
  };
}
