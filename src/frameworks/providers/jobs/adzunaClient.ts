import { guardedFetch } from "@/frameworks/providers/http/guardedFetch";

import type { JobListing } from "./usajobsClient";

export async function searchAdzuna(query: string, location: string, limit: number): Promise<JobListing[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error("Missing ADZUNA_APP_ID or ADZUNA_APP_KEY");

  const endpoint = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}&results_per_page=${limit}`;

  const payload = (await guardedFetch({
    cacheKey: `adzuna:${query}:${location}:${limit}`,
    rateLimitKey: "adzuna",
    request: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Adzuna failed with status ${response.status}`);
      return response.json();
    },
  })) as {
    results?: Array<{
      id?: string;
      title?: string;
      company?: { display_name?: string };
      location?: { display_name?: string };
      redirect_url?: string;
      salary_min?: number;
      salary_max?: number;
    }>;
  };

  return (payload.results ?? []).map((item) => ({
    source: "adzuna",
    id: item.id ?? "unknown",
    title: item.title ?? "Unknown",
    company: item.company?.display_name ?? "Unknown",
    location: item.location?.display_name ?? location,
    url: item.redirect_url ?? "https://www.adzuna.com/",
    salaryMin: item.salary_min ?? null,
    salaryMax: item.salary_max ?? null,
  }));
}
