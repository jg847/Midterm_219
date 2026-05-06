import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/health/route";

function stubRequiredEnv() {
  vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test");
  vi.stubEnv("OPENCAGE_API_KEY", "opencage-test");
  vi.stubEnv("USAJOBS_API_KEY", "usajobs-test");
  vi.stubEnv("ADZUNA_APP_ID", "adzuna-id");
  vi.stubEnv("ADZUNA_APP_KEY", "adzuna-key");
  vi.stubEnv("RENTCAST_API_KEY", "rentcast-test");
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
}

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays healthy without SENTRY_DSN and reports console telemetry degradation", async () => {
    stubRequiredEnv();
    vi.stubEnv("ENABLE_CONSOLE_TELEMETRY", "true");
    vi.stubEnv("ENABLE_SENTRY_TELEMETRY", "false");

    const response = await GET();
    const payload = (await response.json()) as {
      ok: boolean;
      checks: {
        env: { missing: string[] };
        telemetry: {
          mode: string;
          consoleEnabled: boolean;
          sentryEnabled: boolean;
          degraded: boolean;
        };
        operationalState: {
          mode: string;
          shared: boolean;
          degraded: boolean;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.checks.env.missing).not.toContain("SENTRY_DSN");
    expect(payload.checks.telemetry.mode).toBe("console");
    expect(payload.checks.telemetry.sentryEnabled).toBe(false);
    expect(payload.checks.telemetry.degraded).toBe(true);
    expect(payload.checks.operationalState.mode).toBe("memory");
    expect(payload.checks.operationalState.shared).toBe(false);
    expect(payload.checks.operationalState.degraded).toBe(true);
  });

  it("reports fan-out telemetry mode when console and sentry telemetry are enabled", async () => {
    stubRequiredEnv();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_CONSOLE_TELEMETRY", "true");
    vi.stubEnv("ENABLE_SENTRY_TELEMETRY", "true");
    vi.stubEnv("OPERATIONAL_STATE_DRIVER", "redis");

    const response = await GET();
    const payload = (await response.json()) as {
      checks: {
        telemetry: {
          mode: string;
          consoleEnabled: boolean;
          sentryEnabled: boolean;
          degraded: boolean;
        };
        operationalState: {
          mode: string;
          shared: boolean;
          degraded: boolean;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.checks.telemetry.mode).toBe("fanout");
    expect(payload.checks.telemetry.consoleEnabled).toBe(true);
    expect(payload.checks.telemetry.sentryEnabled).toBe(true);
    expect(payload.checks.telemetry.degraded).toBe(false);
    expect(payload.checks.operationalState.mode).toBe("redis");
    expect(payload.checks.operationalState.shared).toBe(true);
    expect(payload.checks.operationalState.degraded).toBe(false);
  });
});