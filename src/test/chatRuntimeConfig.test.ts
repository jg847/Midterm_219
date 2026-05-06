import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isConsoleTelemetryEnabled,
  isNativeToolUseEnabled,
  isSentryTelemetryEnabled,
  isStreamingChatEnabled,
} from "@/shared/config/chatRuntime";

describe("chat runtime config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults native tool use to disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE", undefined);

    expect(isNativeToolUseEnabled()).toBe(false);
  });

  it("enables native tool use only when the flag is explicitly true", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE", "true");
    expect(isNativeToolUseEnabled()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE", "false");
    expect(isNativeToolUseEnabled()).toBe(false);
  });

  it("enables streaming chat only when the flag is explicitly true", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_STREAMING_CHAT", "true");
    expect(isStreamingChatEnabled()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_ENABLE_STREAMING_CHAT", "false");
    expect(isStreamingChatEnabled()).toBe(false);
  });

  it("keeps console telemetry enabled unless it is explicitly disabled", () => {
    vi.stubEnv("ENABLE_CONSOLE_TELEMETRY", undefined);
    expect(isConsoleTelemetryEnabled()).toBe(true);

    vi.stubEnv("ENABLE_CONSOLE_TELEMETRY", "false");
    expect(isConsoleTelemetryEnabled()).toBe(false);
  });

  it("keeps sentry telemetry off in tests even when a DSN is present", () => {
    vi.stubEnv("SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/0");
    expect(isSentryTelemetryEnabled()).toBe(false);
  });

  it("allows explicit sentry telemetry enablement outside tests", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_SENTRY_TELEMETRY", "true");

    expect(isSentryTelemetryEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", originalNodeEnv);
  });

  it("does not auto-enable sentry telemetry in development just because a DSN is present", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/0");

    expect(isSentryTelemetryEnabled()).toBe(false);
  });
});