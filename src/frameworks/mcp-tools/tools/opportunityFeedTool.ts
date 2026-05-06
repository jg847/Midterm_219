import hudMarketSeed from "../../../../data/seeds/hud-fmr-2026.seed.json";
import { buildSupportResources } from "@/application/location/BuildSupportResources";
import { hourlyWageNeededForHousingBurden } from "@/domain/entities/HousingMarketMath";
import type { SupportResourceLink } from "@/domain/models/SupportResource";
import {
  OpportunityFeedInputSchema,
  type OpportunityFeedInput,
} from "@/shared/schemas/toolContracts";
import { searchAdzuna } from "@/frameworks/providers/jobs/adzunaClient";
import { searchUsaJobs } from "@/frameworks/providers/jobs/usajobsClient";
import { searchRentcast } from "@/frameworks/providers/rentcast/rentcastClient";

import { fail, mapToolError, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";
import { resolveHousingBaselineRow } from "./locationResolutionUtils";

type OpportunityFeedOutput = {
  location: {
    label: string;
    city: string;
    state: string;
    radiusMiles: number;
  };
  jobs: {
    count: number;
    listings: Array<{
      title: string;
      company: string;
      location: string;
      url: string;
    }>;
  };
  housing: {
    count: number;
    listings: Array<{
      formattedAddress: string;
      rent: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
    }>;
    baseline: {
      fmrMonthly: number;
      hourlyWageNeededFor30Pct: number;
    };
    locationResolution?: ReturnType<typeof resolveHousingBaselineRow> extends { locationResolution: infer T } | null ? T : never;
  };
  resources: SupportResourceLink[];
};

function getFallbackBaseline(city: string, state: string): {
  fmrMonthly: number;
  hourlyWageNeededFor30Pct: number;
  locationResolution?: ReturnType<typeof resolveHousingBaselineRow> extends { locationResolution: infer T } | null ? T : never;
} {
  const rows = hudMarketSeed as Array<{
    location: string;
    bedroomCount: number;
    fmrMonthly: number;
  }>;

  const resolved = resolveHousingBaselineRow(rows, `${city}, ${state}`, state, 1);
  if (!resolved) {
    return {
      fmrMonthly: 0,
      hourlyWageNeededFor30Pct: 0,
      locationResolution: {
        resolvedLabel: "National benchmark",
        resolutionKind: "national_benchmark",
        usedFallback: true,
        fallbackReason: `No seeded housing baseline is available yet for ${city}, ${state}, and no national benchmark could be derived from the current seed.`,
      },
    };
  }

  return {
    fmrMonthly: resolved.row.fmrMonthly,
    hourlyWageNeededFor30Pct: hourlyWageNeededForHousingBurden(resolved.row.fmrMonthly, 30),
    locationResolution: resolved.locationResolution,
  };
}

export const opportunityFeedTool: ToolDefinition<OpportunityFeedInput, OpportunityFeedOutput> = {
  name: "opportunity_feed_tool",
  description:
    "Aggregate jobs, housing, and support resources for one resolved market. Job providers use location text, housing uses city and state, RentCast does not support true radius filtering, and any housing baseline fallback is returned with locationResolution metadata so the caller can disclose the exact benchmark market used.",
  inputSchema: OpportunityFeedInputSchema,
  async execute(input) {
    try {
      const [usaJobsResult, adzunaResult, housingResult] = await Promise.allSettled([
        searchUsaJobs(input.query, input.location, input.limit),
        searchAdzuna(input.query, input.location, input.limit),
        searchRentcast(input.city, input.state, input.limit),
      ]);

      const usaJobs = usaJobsResult.status === "fulfilled" ? usaJobsResult.value : [];
      const adzuna = adzunaResult.status === "fulfilled" ? adzunaResult.value : [];
      const housingListings = housingResult.status === "fulfilled" ? housingResult.value : [];

      const mergedJobs = [...usaJobs, ...adzuna].slice(0, input.limit);
      const baseline = getFallbackBaseline(input.city, input.state);

      return ok({
        location: {
          label: input.location,
          city: input.city,
          state: input.state,
          radiusMiles: input.radiusMiles,
        },
        jobs: {
          count: mergedJobs.length,
          listings: mergedJobs.map((item) => ({
            title: item.title,
            company: item.company,
            location: item.location,
            url: item.url,
          })),
        },
        housing: {
          count: housingListings.length,
          listings: housingListings.map((item) => ({
            formattedAddress: item.formattedAddress,
            rent: item.rent,
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
          })),
          baseline,
          locationResolution: baseline.locationResolution,
        },
        resources: buildSupportResources({
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
        }),
      });
    } catch (error) {
      return fail(mapToolError(error));
    }
  },
};
