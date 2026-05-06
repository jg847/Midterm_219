import { HousingSearchInputSchema, type HousingSearchInput } from "@/shared/schemas/toolContracts";
import { hourlyWageNeededForHousingBurden } from "@/domain/entities/HousingMarketMath";
import { searchRentcast } from "@/frameworks/providers/rentcast/rentcastClient";
import hudMarketSeed from "../../../../data/seeds/hud-fmr-2026.seed.json";

import { fail, mapToolError, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";
import { resolveHousingBaselineRow } from "./locationResolutionUtils";

type HousingSearchOutput = {
  listings: Awaited<ReturnType<typeof searchRentcast>>;
  fallback?: {
    location: string;
    fmrMonthly: number;
    hourlyWageNeededFor30Pct: number;
  };
  locationResolution?: ReturnType<typeof resolveHousingBaselineRow> extends { locationResolution: infer T } | null ? T : never;
};

export const housingSearchTool: ToolDefinition<HousingSearchInput, HousingSearchOutput> = {
  name: "housing_search_tool",
  description:
    "Retrieve rental listings from RentCast using city and state filters. RentCast does not support radius filtering in this path, so the caller must disclose that limitation when relevant. If no live listings match, the tool returns a disclosed HUD baseline fallback or national benchmark with locationResolution metadata instead of silently defaulting to another market.",
  inputSchema: HousingSearchInputSchema,
  async execute(input) {
    try {
      const listings = await searchRentcast(input.city, input.state, input.limit);
      const filtered = listings.filter((listing) => {
        if (input.minRent !== undefined && (listing.rent ?? 0) < input.minRent) return false;
        if (input.maxRent !== undefined && (listing.rent ?? Number.MAX_SAFE_INTEGER) > input.maxRent)
          return false;
        return true;
      });

      if (filtered.length > 0) {
        return ok({ listings: filtered });
      }

      const hudRows = hudMarketSeed as Array<{
        location: string;
        bedroomCount: number;
        fmrMonthly: number;
      }>;
      const fallbackRow =
        resolveHousingBaselineRow(hudRows, `${input.city}, ${input.state}`, input.state, 1);

      if (!fallbackRow) {
        return ok({
          listings: [],
          locationResolution: {
            resolvedLabel: "National benchmark",
            resolutionKind: "national_benchmark",
            usedFallback: true,
            fallbackReason: `No seeded housing baseline is available yet for ${input.city}, ${input.state}, and no national benchmark could be derived from the current seed.`,
          },
        });
      }

      return ok({
        listings: [],
        fallback: {
          location: fallbackRow.row.location,
          fmrMonthly: fallbackRow.row.fmrMonthly,
          hourlyWageNeededFor30Pct: hourlyWageNeededForHousingBurden(fallbackRow.row.fmrMonthly, 30),
        },
        locationResolution: fallbackRow.locationResolution,
      });
    } catch (error) {
      return fail(mapToolError(error));
    }
  },
};
