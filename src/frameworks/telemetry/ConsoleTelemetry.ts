import type { TelemetryEvent, TelemetryPort } from "@/application/ports/TelemetryPort";

export class ConsoleTelemetry implements TelemetryPort {
  track(event: TelemetryEvent): void {
    console.log(`[telemetry] ${event.name}`, event.attributes);
  }
}
