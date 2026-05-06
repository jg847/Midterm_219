import { guardedFetch } from "@/frameworks/providers/http/guardedFetch";

export type HousingListing = {
  id: string;
  formattedAddress: string;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rent: number | null;
  source: "rentcast";
};

export async function searchRentcast(
  city: string,
  state: string,
  limit: number,
): Promise<HousingListing[]> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) throw new Error("Missing RENTCAST_API_KEY");

  const endpoint = `https://api.rentcast.io/v1/listings/rental/long-term?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&limit=${limit}`;

  const payload = (await guardedFetch({
    cacheKey: `rentcast:${city}:${state}:${limit}`,
    rateLimitKey: "rentcast",
    request: async () => {
      const response = await fetch(endpoint, {
        headers: {
          accept: "application/json",
          "X-Api-Key": apiKey,
        },
      });
      if (!response.ok) throw new Error(`RentCast failed with status ${response.status}`);
      return response.json();
    },
  })) as Array<{
    id?: string;
    formattedAddress?: string;
    city?: string;
    state?: string;
    bedrooms?: number;
    bathrooms?: number;
    price?: number;
  }>;

  return payload.map((item) => ({
    id: item.id ?? "unknown",
    formattedAddress: item.formattedAddress ?? `${city}, ${state}`,
    city: item.city ?? city,
    state: item.state ?? state,
    bedrooms: item.bedrooms ?? null,
    bathrooms: item.bathrooms ?? null,
    rent: item.price ?? null,
    source: "rentcast",
  }));
}
