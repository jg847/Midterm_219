import { hourlyWageNeededForHousingBurden } from "@/domain/entities/HousingMarketMath";
import {
  HousingDigestInputSchema,
  type HousingDigestInput,
} from "@/shared/schemas/toolContracts";

import { fail, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";
import { housingMarketTool } from "./housingMarketTool";
import { housingSearchTool } from "./housingSearchTool";
import { listingActionLinksTool } from "./listingActionLinksTool";

type HousingDigestCard = {
  title: string;
  rentLabel: string;
  details: string[];
  affordability: {
    label: string;
    tone: "good" | "warn";
    detail: string;
  };
  actions: Array<{
    label: string;
    url: string;
  }>;
};

type HousingDigestOutput = {
  headline: string;
  summary: string;
  keyStats: Array<{ label: string; value: string }>;
  cards: HousingDigestCard[];
  warnings: string[];
  locationResolution?: NonNullable<Awaited<ReturnType<typeof housingSearchTool.execute>> extends infer T ? T extends { ok: true; data: infer D } ? D extends { locationResolution?: infer R } ? R : never : never : never>;
};

type ListingShape = {
  formattedAddress: string;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rent: number | null;
};

function extractBudget(query: string): number | undefined {
  const match = query.match(/(?:under|below|<=?)\s*\$?([\d,]{3,7})/i) ?? query.match(/\$([\d,]{3,7})/);
  if (!match?.[1]) {
    return undefined;
  }

  const numeric = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function affordabilitySummary(rent: number | null, baseline: number) {
  if (rent === null) {
    return {
      label: "Unknown",
      tone: "warn" as const,
      detail: "Rent not available for comparison.",
    };
  }

  const difference = baseline - rent;
  if (difference >= 100) {
    return {
      label: "Affordable",
      tone: "good" as const,
      detail: `$${Math.abs(difference)} below benchmark`,
    };
  }

  return {
    label: "Borderline",
    tone: "warn" as const,
    detail: difference >= 0 ? `$${difference} below baseline` : `$${Math.abs(difference)} above baseline`,
  };
}

export const housingDigestTool: ToolDefinition<HousingDigestInput, HousingDigestOutput> = {
  name: "housing_digest_tool",
  description:
    "Create housing summary cards from rental search results plus any disclosed HUD fallback baseline. The output preserves locationResolution metadata so the assistant can explain which market was actually used when live listings or exact baselines are missing.",
  inputSchema: HousingDigestInputSchema,
  async execute(input) {
    const budget = extractBudget(input.query);
    const [result, market] = await Promise.all([
      housingSearchTool.execute({
        city: input.city,
        state: input.state,
        maxRent: budget,
        limit: input.limit,
      }),
      housingMarketTool.execute({
        location: `${input.city}, ${input.state}`,
        bedroomCount: 1,
      }),
    ]);

    if (!result.ok) {
      return fail(result.error);
    }

    if (!market.ok) {
      return fail(market.error);
    }

    const baselineMonthly = market.data.baseline.fmrMonthly;
    const wageTarget = market.data.baseline.hourlyWageNeededFor30Pct ?? hourlyWageNeededForHousingBurden(baselineMonthly, 30);
    const benchmarkLabel = market.data.locationResolution.resolvedLabel;
    const listings = result.data.listings as ListingShape[];

    const cards = await Promise.all(
      listings.slice(0, 4).map(async (listing) => {
        const links = await listingActionLinksTool.execute({
          formattedAddress: listing.formattedAddress,
          city: listing.city,
          state: listing.state,
          source: "rentcast",
        });

        const actions = links.ok
          ? [{ label: links.data.primaryLabel, url: links.data.primaryUrl }, ...links.data.alternates]
          : [];
        const affordability = affordabilitySummary(listing.rent, baselineMonthly);

        return {
          title: listing.formattedAddress,
          rentLabel: listing.rent !== null ? `$${listing.rent}/month` : "Rent unavailable",
          details: [
            `${listing.bedrooms ?? "?"} bd / ${listing.bathrooms ?? "?"} ba`,
            `Benchmark (${benchmarkLabel}): $${baselineMonthly}/month`,
          ],
          affordability,
          actions,
        } satisfies HousingDigestCard;
      }),
    );

    const warnings: string[] = [];
    if (!cards.length) {
      warnings.push("No live rental listings matched the current filter.");
    }

    return ok({
      headline: `Rental summary for ${input.city}, ${input.state}`,
      summary: cards.length
        ? `Found ${cards.length} rental options${budget ? ` at or below $${budget}` : ""}. Open a card to inspect the listing site directly.`
        : `No rentals matched${budget ? ` your $${budget}` : " the current"} filter.`,
      keyStats: [
        { label: "Listings", value: String(cards.length) },
        { label: "Housing Benchmark", value: `$${baselineMonthly}` },
        { label: "30% Rent Wage", value: `$${wageTarget.toFixed(2)}/hr` },
      ],
      cards,
      warnings: market.data.locationResolution.usedFallback
        ? [...warnings, `Benchmark fallback in use: ${market.data.locationResolution.fallbackReason ?? benchmarkLabel}`]
        : warnings,
      locationResolution: market.data.locationResolution,
    });
  },
};
