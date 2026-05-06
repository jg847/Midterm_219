import { LocationLookupInputSchema, type LocationLookupInput } from "@/shared/schemas/toolContracts";
import { lookupLocation } from "@/frameworks/providers/opencage/opencageClient";

import { fail, mapToolError, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";
import { buildExactLocationResolution } from "./locationResolutionUtils";

type LocationLookupOutput = {
  location: Awaited<ReturnType<typeof lookupLocation>>;
  locationResolution: ReturnType<typeof buildExactLocationResolution>;
};

export const locationLookupTool: ToolDefinition<LocationLookupInput, LocationLookupOutput> = {
  name: "location_lookup_tool",
  description:
    "Geocode and normalize a city, ZIP code, or place query into a resolved market label. Use this tool when the user provides an explicit market; ambiguous state-only requests should be clarified by the runtime before tool execution.",
  inputSchema: LocationLookupInputSchema,
  async execute(input) {
    try {
      const location = await lookupLocation(input.query);
      if (!location) {
        return fail({
          code: "NOT_FOUND",
          message: "Location not found",
          retryable: false,
        });
      }

      return ok({
        location,
        locationResolution: buildExactLocationResolution(location.formatted),
      });
    } catch (error) {
      return fail(mapToolError(error));
    }
  },
};
