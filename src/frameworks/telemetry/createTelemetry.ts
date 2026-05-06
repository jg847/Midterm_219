import type { TelemetryPort } from "@/application/ports/TelemetryPort";
import {
  isConsoleTelemetryEnabled,
  isSentryTelemetryEnabled,
} from "@/shared/config/chatRuntime";

import { ConsoleTelemetry } from "./ConsoleTelemetry";
import { FanOutTelemetry } from "./FanOutTelemetry";
import { SentryTelemetry } from "./SentryTelemetry";

export function createTelemetry(): TelemetryPort {
  const sinks: TelemetryPort[] = [];

  if (isConsoleTelemetryEnabled()) {
    sinks.push(new ConsoleTelemetry());
  }

  if (isSentryTelemetryEnabled()) {
    sinks.push(new SentryTelemetry());
  }

  if (sinks.length === 0) {
    return new ConsoleTelemetry();
  }

  if (sinks.length === 1) {
    return sinks[0];
  }

  return new FanOutTelemetry(sinks);
}