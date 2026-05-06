import type { TelemetryEvent, TelemetryPort } from "@/application/ports/TelemetryPort";

export class FanOutTelemetry implements TelemetryPort {
  constructor(private readonly sinks: TelemetryPort[]) {}

  track(event: TelemetryEvent): void {
    for (const sink of this.sinks) {
      try {
        sink.track(event);
      } catch (error) {
        console.warn("[telemetry] sink failure", error);
      }
    }
  }
}