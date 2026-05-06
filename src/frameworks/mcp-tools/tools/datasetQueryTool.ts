import { DatasetQueryInputSchema, type DatasetQueryInput } from "@/shared/schemas/toolContracts";
import { getStoryReferenceSeed } from "@/shared/data/storyReferenceSeed";

import { ok } from "../toolUtils";
import type { ToolDefinition } from "../types";

type DatasetQueryOutput = {
  location: string;
  sourceLabel: string;
  disclosure: string;
  metric: string;
  value: unknown;
};

export const datasetQueryTool: ToolDefinition<DatasetQueryInput, DatasetQueryOutput> = {
  name: "dataset_query_tool",
  description: "Query reference affordability benchmark metrics used to calibrate story views and comparison surfaces.",
  inputSchema: DatasetQueryInputSchema,
  async execute(input) {
    const data = getStoryReferenceSeed();

    if (input.metric === "livingWage") {
      return ok({
        location: data.referenceLabel,
        sourceLabel: data.sourceLabel,
        disclosure: data.disclosure,
        metric: input.metric,
        value: data.wages.livingWage,
      });
    }

    if (input.metric === "minimumWage") {
      return ok({
        location: data.referenceLabel,
        sourceLabel: data.sourceLabel,
        disclosure: data.disclosure,
        metric: input.metric,
        value: data.wages.minimumWage,
      });
    }

    if (input.metric === "currentMonthlyRent") {
      return ok({
        location: data.referenceLabel,
        sourceLabel: data.sourceLabel,
        disclosure: data.disclosure,
        metric: input.metric,
        value: Number(data.rent.currentMonthlyRent.toFixed(2)),
      });
    }

    return ok({
      location: data.referenceLabel,
      sourceLabel: data.sourceLabel,
      disclosure: data.disclosure,
      metric: input.metric,
      value: data.rent.rentTrend.slice(-24),
    });
  },
};
