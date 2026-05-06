import { afterEach, describe, expect, it, vi } from "vitest";

import type { TelemetryPort } from "@/application/ports/TelemetryPort";

const { createTelemetryMock } = vi.hoisted(() => ({
  createTelemetryMock: vi.fn(),
}));

vi.mock("@/frameworks/telemetry/createTelemetry", () => ({
  createTelemetry: createTelemetryMock,
}));

describe("chat runtime telemetry composition", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses the telemetry factory output in the runtime", async () => {
    const telemetry: TelemetryPort = { track: vi.fn() };
    createTelemetryMock.mockReturnValue(telemetry);

    const { getChatRuntime } = await import("@/app/api/chat/runtime");
    const runtime = getChatRuntime();

    expect(createTelemetryMock).toHaveBeenCalled();
    expect(runtime.telemetry).toBe(telemetry);
  });
});