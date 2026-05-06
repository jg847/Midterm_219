import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPolicySnippet,
  normalizeLocationContext,
} from "@/application/location/LocationContextService";
import { buildRequestKey, checkApiRateLimit } from "@/frameworks/http/ApiRateLimiter";
import { createMcpServer } from "@/frameworks/mcp-tools";

const ResolveLocationSchema = z
  .object({
    query: z.string().min(2).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    radiusMiles: z.number().int().min(1).max(100).optional(),
  })
  .refine((value) => Boolean(value.query) || (value.lat !== undefined && value.lng !== undefined), {
    message: "Provide either query or lat/lng",
  });

const mcpServer = createMcpServer();

type ToolResultShape = {
  ok: boolean;
  data?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const rateLimit = await checkApiRateLimit({
    bucket: "api-location-resolve",
    key: buildRequestKey(request),
    maxRequests: Number(process.env.API_RATE_LIMIT_LOCATION_PER_MINUTE ?? 40),
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Rate limit exceeded. Please retry shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = ResolveLocationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid location payload" }, { status: 400 });
  }

  const lookupQuery =
    parsed.data.query ??
    `${String(parsed.data.lat).trim()},${String(parsed.data.lng).trim()}`;

  const lookup = (await mcpServer.callTool("location_lookup_tool", {
    query: lookupQuery,
  })) as ToolResultShape;

  if (!lookup.ok || !lookup.data?.location || typeof lookup.data.location !== "object") {
    return NextResponse.json(
      { ok: false, error: "Unable to resolve location. Try a different city or zip." },
      { status: 404 },
    );
  }

  const rawLocation = lookup.data.location as Record<string, unknown>;
  const normalized = normalizeLocationContext({
    formatted: String(rawLocation.formatted ?? "Unknown"),
    city: String(rawLocation.city ?? "Unknown"),
    state: String(rawLocation.state ?? "NA"),
    country: String(rawLocation.country ?? "US"),
    postalCode: typeof rawLocation.postalCode === "string" ? rawLocation.postalCode : undefined,
    lat: typeof rawLocation.lat === "number" ? rawLocation.lat : undefined,
    lng: typeof rawLocation.lng === "number" ? rawLocation.lng : undefined,
    radiusMiles: parsed.data.radiusMiles,
  });

  const market = (await mcpServer.callTool("housing_market_tool", {
    location: normalized.formatted,
    bedroomCount: 1,
  })) as ToolResultShape;

  const marketBaseline =
    market.ok && market.data?.baseline && typeof market.data.baseline === "object"
      ? (market.data.baseline as Record<string, unknown>)
      : null;
  const marketResolution =
    market.ok && market.data?.locationResolution && typeof market.data.locationResolution === "object"
      ? (market.data.locationResolution as Record<string, unknown>)
      : null;

  const policy = getPolicySnippet(normalized.state);

  return NextResponse.json({
    ok: true,
    location: {
      formatted: normalized.formatted,
      city: normalized.city,
      state: normalized.state,
      country: normalized.country,
      postalCode: normalized.postalCode,
      radiusMiles: normalized.radiusMiles,
      consentGeolocation: parsed.data.lat !== undefined && parsed.data.lng !== undefined,
    },
    policy,
    baseline: marketBaseline
      ? {
          fmrMonthly: Number(marketBaseline.fmrMonthly ?? 0),
          hourlyWageNeededFor30Pct: Number(marketBaseline.hourlyWageNeededFor30Pct ?? 0),
        }
      : undefined,
    baselineResolution: marketResolution
      ? {
          resolvedLabel: String(marketResolution.resolvedLabel ?? normalized.formatted),
          resolutionKind: String(marketResolution.resolutionKind ?? "exact"),
          usedFallback: Boolean(marketResolution.usedFallback),
          fallbackReason:
            typeof marketResolution.fallbackReason === "string" ? marketResolution.fallbackReason : undefined,
        }
      : undefined,
  });
}
