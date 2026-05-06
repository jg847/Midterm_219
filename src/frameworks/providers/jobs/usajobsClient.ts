import { guardedFetch } from "@/frameworks/providers/http/guardedFetch";

export type JobListing = {
  source: "usajobs" | "adzuna";
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  salaryMin: number | null;
  salaryMax: number | null;
};

export async function searchUsaJobs(
  query: string,
  location: string,
  limit: number,
  jobCategoryCode?: string,
): Promise<JobListing[]> {
  const apiKey = process.env.USAJOBS_API_KEY;
  const userAgent = process.env.USAJOBS_USER_AGENT;
  if (!apiKey) throw new Error("Missing USAJOBS_API_KEY");
  if (!userAgent) throw new Error("Missing USAJOBS_USER_AGENT");

  const searchParams = new URLSearchParams({
    Keyword: query,
    LocationName: location,
    ResultsPerPage: String(limit),
  });

  if (jobCategoryCode) {
    searchParams.set("JobCategoryCode", jobCategoryCode);
  }

  const endpoint = `https://data.usajobs.gov/api/search?${searchParams.toString()}`;

  const payload = (await guardedFetch({
    cacheKey: `usajobs:${query}:${location}:${limit}`,
    rateLimitKey: "usajobs",
    request: async () => {
      const response = await fetch(endpoint, {
        headers: {
          Host: "data.usajobs.gov",
          "User-Agent": userAgent,
          "Authorization-Key": apiKey,
        },
      });
      if (!response.ok) throw new Error(`USAJOBS failed with status ${response.status}`);
      return response.json();
    },
  })) as {
    SearchResult?: {
      SearchResultItems?: Array<{
        MatchedObjectId?: string;
        MatchedObjectDescriptor?: {
          PositionTitle?: string;
          OrganizationName?: string;
          PositionLocationDisplay?: string;
          PositionURI?: string;
          PositionRemuneration?: Array<{ MinimumRange?: string; MaximumRange?: string }>;
        };
      }>;
    };
  };

  return (payload.SearchResult?.SearchResultItems ?? []).map((item) => ({
    source: "usajobs",
    id: item.MatchedObjectId ?? "unknown",
    title: item.MatchedObjectDescriptor?.PositionTitle ?? "Unknown",
    company: item.MatchedObjectDescriptor?.OrganizationName ?? "USAJOBS",
    location: item.MatchedObjectDescriptor?.PositionLocationDisplay ?? location,
    url: item.MatchedObjectDescriptor?.PositionURI ?? "https://www.usajobs.gov/",
    salaryMin: item.MatchedObjectDescriptor?.PositionRemuneration?.[0]?.MinimumRange
      ? Number(item.MatchedObjectDescriptor.PositionRemuneration[0].MinimumRange)
      : null,
    salaryMax: item.MatchedObjectDescriptor?.PositionRemuneration?.[0]?.MaximumRange
      ? Number(item.MatchedObjectDescriptor.PositionRemuneration[0].MaximumRange)
      : null,
  }));
}
