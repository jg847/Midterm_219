import { JobDigestInputSchema, type JobDigestInput } from "@/shared/schemas/toolContracts";

import { fail, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";
import { jobSearchTool } from "./jobSearchTool";

type JobDigestCard = {
  variant?: "listing" | "fallback";
  title: string;
  company: string;
  location: string;
  salaryLabel: string;
  actions: Array<{
    label: string;
    url: string;
  }>;
};

type JobDigestOutput = {
  headline: string;
  summary: string;
  keyStats: Array<{ label: string; value: string }>;
  cards: JobDigestCard[];
  warnings: string[];
};

function salaryLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `$${min.toLocaleString()}-$${max.toLocaleString()}`;
  }

  if (min !== null) {
    return `From $${min.toLocaleString()}`;
  }

  if (max !== null) {
    return `Up to $${max.toLocaleString()}`;
  }

  return "Salary not listed";
}

function buildSearchUrl(baseUrl: string, query: string, location: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("k", query);
  url.searchParams.set("l", location);
  return url.toString();
}

function normalizeJobQuery(query: string): string {
  const normalized = query
    .toLowerCase()
    .replace(/\b(find|show|search|look for|help me find|browse|open)\b/g, " ")
    .replace(/\bjobs?\b/g, " ")
    .replace(/\bwithin\s+\d+\s+miles?\b/g, " ")
    .replace(/\bnear me\b/g, " ")
    .replace(/\bin this location\b/g, " ")
    .replace(/\bnear\s+[a-z\s,]+$/g, " ")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/entry-level/g, "entry level")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "entry level";
}

function fallbackCards(input: JobDigestInput): JobDigestCard[] {
  const normalizedQuery = normalizeJobQuery(input.query);

  return [
    {
      variant: "fallback",
      title: "Broaden the search",
      company: "Try adjacent entry-level titles",
      location: input.location,
      salaryLabel: `Start with \"${normalizedQuery}\" and adjacent analyst, coordinator, support, or specialist titles`,
      actions: [
        {
          label: "Search USAJOBS",
          url: buildSearchUrl("https://www.usajobs.gov/Search/Results", normalizedQuery, input.location),
        },
        {
          label: "Search Adzuna",
          url: buildSearchUrl("https://www.adzuna.com/search", normalizedQuery, input.location),
        },
      ],
    },
    {
      variant: "fallback",
      title: "Use workforce support",
      company: "American Job Centers",
      location: input.location,
      salaryLabel: "Free resume help, placement support, and training guidance",
      actions: [
        {
          label: "Find a Job Center",
          url: "https://www.careeronestop.org/LocalHelp/service-locator.aspx",
        },
      ],
    },
  ];
}

export const jobDigestTool: ToolDefinition<JobDigestInput, JobDigestOutput> = {
  name: "job_digest_tool",
  description: "Create clean, clickable job cards from search results.",
  inputSchema: JobDigestInputSchema,
  async execute(input) {
    const result = await jobSearchTool.execute({
      query: input.query,
      location: input.location,
      limit: input.limit,
      jobCategoryCode: input.jobCategoryCode,
    });

    if (!result.ok) {
      return fail(result.error);
    }

    const listings = result.data.listings.slice(0, 4);
    const warnings: string[] = [];
    if (!listings.length) {
      warnings.push("No live jobs matched the current search. Try broader titles or workforce support links below.");
    }

    const cards = listings.length
      ? listings.map((listing) => ({
          variant: "listing" as const,
          title: listing.title,
          company: listing.company,
          location: listing.location,
          salaryLabel: salaryLabel(listing.salaryMin, listing.salaryMax),
          actions: [{ label: "Open listing", url: listing.url }],
        }))
      : fallbackCards(input);

    const listingsWithSalary = listings.filter(
      (listing) => listing.salaryMin !== null || listing.salaryMax !== null,
    ).length;

    return ok({
      headline: `Job summary for ${input.location}`,
      summary: listings.length
        ? `Found ${cards.length} openings. Open any card below to review the full listing.`
        : `No live jobs matched this search.`,
      keyStats: [
        { label: "Openings", value: String(listings.length) },
        { label: "With Salary", value: String(listingsWithSalary) },
        { label: "Search", value: input.jobCategoryCode ? `Series ${input.jobCategoryCode}` : input.query },
      ],
      cards,
      warnings,
    });
  },
};
