import { NextResponse } from "next/server";

import {
  isConsoleTelemetryEnabled,
  isSentryTelemetryEnabled,
} from "@/shared/config/chatRuntime";
import {
  getOperationalStateStoreMode,
  shouldUseRedisOperationalStateStore,
} from "@/shared/config/operationalState";

const REQUIRED_SERVER_ENV = [
  "ANTHROPIC_API_KEY",
  "OPENCAGE_API_KEY",
  "USAJOBS_API_KEY",
  "ADZUNA_APP_ID",
  "ADZUNA_APP_KEY",
  "RENTCAST_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export async function GET() {
  const missing = REQUIRED_SERVER_ENV.filter((key) => !process.env[key]);
  const consoleTelemetryEnabled = isConsoleTelemetryEnabled();
  const sentryTelemetryEnabled = isSentryTelemetryEnabled();
  const operationalStateMode = getOperationalStateStoreMode();
  const telemetryMode = sentryTelemetryEnabled
    ? consoleTelemetryEnabled
      ? "fanout"
      : "sentry"
    : consoleTelemetryEnabled
      ? "console"
      : "console_fallback";

  return NextResponse.json(
    {
      ok: missing.length === 0,
      timestamp: new Date().toISOString(),
      checks: {
        env: {
          missingCount: missing.length,
          missing,
        },
        telemetry: {
          mode: telemetryMode,
          consoleEnabled: consoleTelemetryEnabled,
          sentryEnabled: sentryTelemetryEnabled,
          degraded: !sentryTelemetryEnabled,
        },
        operationalState: {
          mode: operationalStateMode,
          shared: shouldUseRedisOperationalStateStore(),
          degraded: operationalStateMode !== "redis",
        },
      },
    },
    {
      status: missing.length === 0 ? 200 : 503,
    },
  );
}
