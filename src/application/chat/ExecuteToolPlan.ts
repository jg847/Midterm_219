import type { ToolExecutor } from "@/application/ports/ToolExecutor";
import type { LocationContext } from "@/domain/models/LocationContext";

import type { ToolExecutionResult } from "./types";

function defaultInputForTool(
  toolName: string,
  message: string,
  location?: Partial<LocationContext>,
): Record<string, unknown> {
  const locationLabel = location?.formatted ?? "National, US";
  const city = location?.city ?? "National";
  const state = location?.state ?? "US";

  if (toolName === "job_search_tool") {
    return { query: message, location: locationLabel, limit: 5 };
  }

  if (toolName === "job_digest_tool") {
    return { query: message, location: locationLabel, limit: 5 };
  }

  if (toolName === "housing_search_tool") {
    return { city, state, limit: 5 };
  }

  if (toolName === "housing_market_tool") {
    return { location: locationLabel, bedroomCount: 1 };
  }

  if (toolName === "location_lookup_tool") {
    return { query: locationLabel || message };
  }

  if (toolName === "opportunity_feed_tool") {
    return {
      query: message,
      location: locationLabel,
      city,
      state,
      zipCode: location?.postalCode,
      radiusMiles: location?.radiusMiles ?? 15,
      limit: 5,
    };
  }

  if (toolName === "ui_digest_tool") {
    return {
      query: message,
      location: locationLabel,
      city,
      state,
      zipCode: location?.postalCode,
      radiusMiles: location?.radiusMiles ?? 15,
      limit: 5,
    };
  }

  if (toolName === "housing_digest_tool") {
    return {
      query: message,
      location: locationLabel,
      city,
      state,
      radiusMiles: location?.radiusMiles ?? 15,
      limit: 5,
    };
  }

  if (toolName === "dataset_query_tool") {
    return { metric: "currentMonthlyRent" };
  }

  if (toolName === "rag_retrieval_tool") {
    return { query: message, limit: 3 };
  }

  return { question: message };
}

export async function executeToolPlan(
  toolExecutor: ToolExecutor,
  toolNames: string[],
  message: string,
  location?: Partial<LocationContext>,
): Promise<ToolExecutionResult[]> {
  const outputs: ToolExecutionResult[] = [];

  for (const toolName of toolNames) {
    const startedAt = Date.now();
    try {
      const payload = await toolExecutor.execute(
        toolName,
        defaultInputForTool(toolName, message, location),
      );
      const latencyMs = Date.now() - startedAt;

      const asResult = payload as { ok?: boolean; error?: { code?: string } };
      outputs.push({
        toolName,
        ok: Boolean(asResult.ok),
        latencyMs,
        payload,
        errorCode: asResult.ok ? undefined : asResult.error?.code,
      });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      outputs.push({
        toolName,
        ok: false,
        latencyMs,
        payload: {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : "Unexpected tool failure",
            retryable: true,
          },
        },
        errorCode: "INTERNAL_ERROR",
      });
    }
  }

  return outputs;
}
