import { createOperationalStateStore } from "@/frameworks/operational-state/createOperationalStateStore";

type WindowState = {
  requestTimestamps: number[];
};

type RateLimitInput = {
  bucket: string;
  key: string;
  maxRequests: number;
  windowMs?: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

const DEFAULT_WINDOW_MS = 60_000;

function normalizeWindow(state: WindowState, now: number, windowMs: number): WindowState {
  const threshold = now - windowMs;
  return {
    requestTimestamps: state.requestTimestamps.filter((timestamp) => timestamp > threshold),
  };
}

export async function checkApiRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = input.windowMs ?? DEFAULT_WINDOW_MS;
  const cacheKey = `${input.bucket}:${input.key}`;
  const store = createOperationalStateStore();

  const existing = (await store.get<WindowState>(`api-rate-limit:${cacheKey}`)) ?? { requestTimestamps: [] };
  const normalized = normalizeWindow(existing, now, windowMs);

  if (normalized.requestTimestamps.length >= input.maxRequests) {
    const oldestTimestamp = normalized.requestTimestamps[0] ?? now;
    const retryAfterMs = Math.max(1_000, oldestTimestamp + windowMs - now);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
      remaining: 0,
    };
  }

  normalized.requestTimestamps.push(now);
  await store.set(`api-rate-limit:${cacheKey}`, normalized, Math.ceil(windowMs / 1000));

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, input.maxRequests - normalized.requestTimestamps.length),
  };
}

export function buildRequestKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.slice(0, 120) ?? "unknown-agent";
  const ip = forwarded || realIp || "unknown-ip";
  return `${ip}:${userAgent}`;
}

export async function clearApiRateLimitState(): Promise<void> {
  await createOperationalStateStore().clear();
}
