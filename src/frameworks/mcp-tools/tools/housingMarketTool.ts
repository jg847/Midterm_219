import hudMarketSeed from "../../../../data/seeds/hud-fmr-2026.seed.json";
import { hourlyWageNeededForHousingBurden } from "@/domain/entities/HousingMarketMath";
import { HousingMarketInputSchema, type HousingMarketInput } from "@/shared/schemas/toolContracts";

import { ok } from "../toolUtils";
import type { ToolDefinition } from "../types";
import { resolveHousingBaselineRow } from "./locationResolutionUtils";

type HousingMarketRow = {
  location: string;
  bedroomCount: number;
  fmrMonthly: number;
};

type HousingMarketOutput = {
  baseline: {
    location: string;
    bedroomCount: number;
    fmrMonthly: number;
    hourlyWageNeededFor30Pct: number;
  };
  locationResolution: ReturnType<typeof resolveHousingBaselineRow> extends { locationResolution: infer T } | null ? T : never;
};

export const housingMarketTool: ToolDefinition<HousingMarketInput, HousingMarketOutput> = {
  name: "housing_market_tool",
  description:
    "Get a HUD-based housing baseline and wage guidance for a specific market. When the exact market is missing from the seed, the tool returns a disclosed same-state, default-metro, or national benchmark fallback and includes locationResolution metadata describing the resolved market used.",
  inputSchema: HousingMarketInputSchema,
  async execute(input) {
    const rows = hudMarketSeed as HousingMarketRow[];
    const state = input.location.split(",").at(-1)?.trim().toUpperCase() ?? "";
    const resolved = resolveHousingBaselineRow(rows, input.location, state, input.bedroomCount);
    if (!resolved) {
      return ok({
        baseline: {
          location: "National benchmark",
          bedroomCount: input.bedroomCount,
          fmrMonthly: 0,
          hourlyWageNeededFor30Pct: 0,
        },
        locationResolution: {
          resolvedLabel: "National benchmark",
          resolutionKind: "national_benchmark",
          usedFallback: true,
          fallbackReason: `No seeded HUD baseline is available yet for ${input.location}, and no national benchmark could be derived from the current seed.`,
        },
      });
    }

    const hourlyWageNeededFor30Pct = hourlyWageNeededForHousingBurden(resolved.row.fmrMonthly, 30);

    return ok({
      baseline: {
        location: resolved.row.location,
        bedroomCount: resolved.row.bedroomCount,
        fmrMonthly: resolved.row.fmrMonthly,
        hourlyWageNeededFor30Pct,
      },
      locationResolution: resolved.locationResolution,
    });
  },
};
