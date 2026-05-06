export type TelemetryEvent = {
  name: string;
  attributes: Record<string, string | number | boolean | null>;
};

export interface TelemetryPort {
  track(event: TelemetryEvent): void;
}
