type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

import { createOperationalStateStore } from "@/frameworks/operational-state/createOperationalStateStore";

type GuardedFetchOptions = {
  cacheKey: string;
  cacheTtlMs?: number;
  rateLimitKey: string;
  maxRequestsPerMinute?: number;
  request: () => Promise<unknown>;
};

function pruneOldRequests(timestamps: number[]): number[] {
  const threshold = Date.now() - 60_000;
  return timestamps.filter((value) => value > threshold);
}

export async function guardedFetch(options: GuardedFetchOptions): Promise<unknown> {
  const store = createOperationalStateStore();
  const cached = await store.get<CacheEntry>(`guarded-fetch:cache:${options.cacheKey}`);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const maxRequests = options.maxRequestsPerMinute ?? 30;
  const timestamps = pruneOldRequests(
    (await store.get<number[]>(`guarded-fetch:window:${options.rateLimitKey}`)) ?? [],
  );
  if (timestamps.length >= maxRequests) {
    throw new Error("RATE_LIMITED");
  }

  timestamps.push(Date.now());
  await store.set(
    `guarded-fetch:window:${options.rateLimitKey}`,
    timestamps,
    60,
  );

  const payload = await options.request();
  const ttlMs = options.cacheTtlMs ?? 60_000;
  await store.set(`guarded-fetch:cache:${options.cacheKey}`, {
    payload,
    expiresAt: Date.now() + ttlMs,
  }, Math.ceil(ttlMs / 1000));

  return payload;
}

export async function clearGuardedFetchState(): Promise<void> {
  await createOperationalStateStore().clear();
}
