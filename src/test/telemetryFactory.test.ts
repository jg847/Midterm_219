import { afterEach, describe, expect, it, vi } from "vitest";

import type { TelemetryEvent, TelemetryPort } from "@/application/ports/TelemetryPort";
import { FanOutTelemetry } from "@/frameworks/telemetry/FanOutTelemetry";
import { createTelemetry } from "@/frameworks/telemetry/createTelemetry";
import { ConsoleTelemetry } from "@/frameworks/telemetry/ConsoleTelemetry";

class RecordingSink implements TelemetryPort {
  public events: TelemetryEvent[] = [];

  track(event: TelemetryEvent): void {
    this.events.push(event);
  }
}

describe("telemetry factory", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns console telemetry when sentry telemetry is unavailable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_CONSOLE_TELEMETRY", "true");
    vi.stubEnv("ENABLE_SENTRY_TELEMETRY", "false");

    const telemetry = createTelemetry();

    expect(telemetry).toBeInstanceOf(ConsoleTelemetry);
  });

  it("returns fan-out telemetry when console and sentry sinks are both enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_CONSOLE_TELEMETRY", "true");
    vi.stubEnv("ENABLE_SENTRY_TELEMETRY", "true");

    const telemetry = createTelemetry();

    expect(telemetry).toBeInstanceOf(FanOutTelemetry);
  });
});

describe("fan-out telemetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("continues delivering events when one sink throws", () => {
    const failingSink: TelemetryPort = {
      track: vi.fn(() => {
        throw new Error("sink failed");
      }),
    };
    const recordingSink = new RecordingSink();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const telemetry = new FanOutTelemetry([failingSink, recordingSink]);

    telemetry.track({
      name: "chat.request.received",
      attributes: { route: "/api/chat" },
    });

    expect(recordingSink.events).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});