import { describe, expect, it, vi } from "vitest";

vi.mock("@/frameworks/mcp-tools", () => ({
  createMcpServer: () => ({
    callTool: async (name: string) => {
      if (name === "location_lookup_tool") {
        return {
          ok: true,
          data: {
            location: {
              formatted: "Austin, TX",
              city: "Austin",
              state: "TX",
              country: "US",
              postalCode: "78701",
              lat: 30.2672,
              lng: -97.7431,
            },
          },
        };
      }

      return {
        ok: true,
        data: {
          baseline: {
            fmrMonthly: 1280,
            hourlyWageNeededFor30Pct: 24.62,
          },
          locationResolution: {
            resolvedLabel: "Houston, TX",
            resolutionKind: "state_default_metro",
            usedFallback: true,
            fallbackReason: "Austin, TX is using Houston, TX as the seeded Texas benchmark.",
          },
        },
      };
    },
  }),
}));

import { POST } from "@/app/api/location/resolve/route";

describe("POST /api/location/resolve", () => {
  it("returns normalized location, policy, and baseline for a valid query", async () => {
    const request = new Request("http://localhost/api/location/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Austin, TX", radiusMiles: 20 }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      ok: boolean;
      location?: { formatted: string; state: string; radiusMiles: number; postalCode?: string };
      baseline?: { fmrMonthly: number };
      baselineResolution?: { resolvedLabel: string; usedFallback: boolean; fallbackReason?: string };
      policy?: { minimumWageHourly: number };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.location?.formatted).toBe("Austin, TX");
    expect(payload.location?.state).toBe("TX");
    expect(payload.location?.postalCode).toBe("78701");
    expect(payload.location?.radiusMiles).toBe(20);
    expect(payload.baseline?.fmrMonthly).toBe(1280);
    expect(payload.baselineResolution?.resolvedLabel).toBe("Houston, TX");
    expect(payload.baselineResolution?.usedFallback).toBe(true);
    expect(payload.policy?.minimumWageHourly).toBe(7.25);
  });
});
