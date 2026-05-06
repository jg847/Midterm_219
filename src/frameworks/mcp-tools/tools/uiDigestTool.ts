import { UiDigestInputSchema, type UiDigestInput } from "@/shared/schemas/toolContracts";

import { fail, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";
import { opportunityFeedTool } from "./opportunityFeedTool";

type UiDigestOutput = {
  headline: string;
  benchmarkLabel: string;
  keyStats: Array<{ label: string; value: string }>;
  topActions: string[];
  warnings: string[];
  cards: Array<{
    title: string;
    lines: string[];
  }>;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

export const uiDigestTool: ToolDefinition<UiDigestInput, UiDigestOutput> = {
  name: "ui_digest_tool",
  description: "Create a compact, UI-ready digest from opportunity feed results.",
  inputSchema: UiDigestInputSchema,
  async execute(input) {
    const feed = await opportunityFeedTool.execute(input);
    if (!feed.ok) {
      return fail(feed.error);
    }

    const data = asObject(feed.data);
    const jobs = asObject(data?.jobs);
    const housing = asObject(data?.housing);
    const baseline = asObject(housing?.baseline);
    const locationResolution = asObject(housing?.locationResolution);

    const jobCount = Number(jobs?.count ?? 0);
    const housingCount = Number(housing?.count ?? 0);
    const fmrMonthly = Number(baseline?.fmrMonthly ?? 0);
    const wageNeeded = Number(baseline?.hourlyWageNeededFor30Pct ?? 0);
    const benchmarkLabel = String(locationResolution?.resolvedLabel ?? `${input.city}, ${input.state}`);

    const warnings: string[] = [];
    if (jobCount === 0) warnings.push("No live jobs were returned in this run.");
    if (housingCount === 0) warnings.push("No live rentals were returned in this run.");
    if (locationResolution?.usedFallback === true && typeof locationResolution?.fallbackReason === "string") {
      warnings.push(locationResolution.fallbackReason);
    }

    const affordabilityRead =
      jobCount > 0 && housingCount > 0
        ? `Side-by-side scan for ${input.city}, ${input.state}: ${jobCount} jobs and ${housingCount} rentals surfaced.`
        : housingCount > 0
          ? `Housing-side read for ${input.city}, ${input.state}: ${housingCount} rentals surfaced, but live jobs were sparse.`
          : `Limited affordability read for ${input.city}, ${input.state}: live jobs and rentals were sparse in this run.`;

    const topActions = [
      "Apply to 2-3 listings with salary transparency this week.",
      "Prioritize rentals at or below the disclosed housing benchmark when possible.",
      "Use housing and workforce assistance links for affordability support.",
    ];

    const cards = [
      {
        title: "Jobs Snapshot",
        lines: [
          `${jobCount} matching openings surfaced`,
          "Focus on roles with posted compensation and growth paths",
        ],
      },
      {
        title: "Housing Snapshot",
        lines: [
          `${housingCount} rental options surfaced`,
          `Benchmark (${benchmarkLabel}): $${fmrMonthly}/mo`,
          `Estimated wage target: $${wageNeeded.toFixed(2)}/hr`,
        ],
      },
    ];

    return ok({
      headline: affordabilityRead,
      benchmarkLabel,
      keyStats: [
        { label: "Jobs", value: String(jobCount) },
        { label: "Rentals", value: String(housingCount) },
        { label: "Housing Benchmark", value: `$${fmrMonthly}` },
        { label: "30% Rent Wage", value: `$${wageNeeded.toFixed(2)}/hr` },
      ],
      topActions,
      warnings,
      cards,
    });
  },
};
