import { afterEach, describe, expect, it, vi } from "vitest";

import { guardedFetch, clearGuardedFetchState } from "@/frameworks/providers/http/guardedFetch";

describe("guardedFetch", () => {
  afterEach(async () => {
    await clearGuardedFetchState();
    vi.useRealTimers();
  });

  it("caches successful responses within the ttl window", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true });

    const first = await guardedFetch({
      cacheKey: "cache-key",
      rateLimitKey: "rate-key",
      cacheTtlMs: 5_000,
      request,
    });

    const second = await guardedFetch({
      cacheKey: "cache-key",
      rateLimitKey: "rate-key",
      cacheTtlMs: 5_000,
      request,
    });

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rate limits repeated uncached requests", async () => {
    await guardedFetch({
      cacheKey: "first",
      rateLimitKey: "shared-window",
      maxRequestsPerMinute: 1,
      request: async () => ({ ok: true }),
    });

    await expect(
      guardedFetch({
        cacheKey: "second",
        rateLimitKey: "shared-window",
        maxRequestsPerMinute: 1,
        request: async () => ({ ok: true }),
      }),
    ).rejects.toThrow("RATE_LIMITED");
  });
});