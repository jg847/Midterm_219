import * as Sentry from "@sentry/nextjs";

import type { TelemetryEvent, TelemetryPort } from "@/application/ports/TelemetryPort";

export class SentryTelemetry implements TelemetryPort {
  track(event: TelemetryEvent): void {
    Sentry.withScope((scope) => {
      scope.setLevel("info");
      for (const [key, value] of Object.entries(event.attributes)) {
        scope.setExtra(key, value);
      }

      Sentry.captureMessage(`[telemetry] ${event.name}`);
    });
  }
}