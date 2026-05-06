export const NATIVE_TOOL_USE_ENABLED_ENV = "NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE";
export const STREAMING_CHAT_ENABLED_ENV = "NEXT_PUBLIC_ENABLE_STREAMING_CHAT";
export const BUDGET_CAPABILITY_ENABLED_ENV = "NEXT_PUBLIC_ENABLE_BUDGET_CAPABILITY";
export const CONSOLE_TELEMETRY_ENABLED_ENV = "ENABLE_CONSOLE_TELEMETRY";
export const SENTRY_TELEMETRY_ENABLED_ENV = "ENABLE_SENTRY_TELEMETRY";
const DEFAULT_CHAT_RESPONSE_MAX_TOKENS = 900;

export function isNativeToolUseEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE === "true";
}

export function isStreamingChatEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_STREAMING_CHAT === "true";
}

export function isBudgetCapabilityEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_BUDGET_CAPABILITY !== "false";
}

export function isConsoleTelemetryEnabled(): boolean {
  return process.env[CONSOLE_TELEMETRY_ENABLED_ENV] !== "false";
}

export function isSentryTelemetryEnabled(): boolean {
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  if (process.env[SENTRY_TELEMETRY_ENABLED_ENV] === "false") {
    return false;
  }

  if (process.env[SENTRY_TELEMETRY_ENABLED_ENV] === "true") {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function getChatResponseMaxTokens(): number {
  const raw = Number(process.env.ANTHROPIC_CHAT_MAX_TOKENS ?? DEFAULT_CHAT_RESPONSE_MAX_TOKENS);

  if (!Number.isFinite(raw) || raw <= 350) {
    return DEFAULT_CHAT_RESPONSE_MAX_TOKENS;
  }

  return Math.floor(raw);
}