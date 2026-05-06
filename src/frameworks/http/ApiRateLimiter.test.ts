import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildRequestKey,
  checkApiRateLimit,
  clearApiRateLimitState,
} from "@/frameworks/http/ApiRateLimiter";
import { resetOperationalStateStoreForTests } from "@/frameworks/operational-state/createOperationalStateStore";

describe("ApiRateLimiter", () => {
  afterEach(async () => {
    await clearApiRateLimitState();
    resetOperationalStateStoreForTests();
    vi.useRealTimers();
  });

  it("allows requests under limit", async () => {
    const first = await checkApiRateLimit({
      bucket: "chat",
      key: "user-1",
      maxRequests: 2,
    });

    const second = await checkApiRateLimit({
      bucket: "chat",
      key: "user-1",
      maxRequests: 2,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks requests above limit and returns retry hint", async () => {
    await checkApiRateLimit({
      bucket: "chat",
      key: "user-2",
      maxRequests: 1,
    });

    const blocked = await checkApiRateLimit({
      bucket: "chat",
      key: "user-2",
      maxRequests: 1,
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("unblocks after window passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    await checkApiRateLimit({
      bucket: "chat",
      key: "user-3",
      maxRequests: 1,
      windowMs: 1_000,
    });

    const blocked = await checkApiRateLimit({
      bucket: "chat",
      key: "user-3",
      maxRequests: 1,
      windowMs: 1_000,
    });

    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(1_050);

    const allowedAgain = await checkApiRateLimit({
      bucket: "chat",
      key: "user-3",
      maxRequests: 1,
      windowMs: 1_000,
    });

    expect(allowedAgain.allowed).toBe(true);
  });

  it("builds request key from headers", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "user-agent": "vitest-agent",
      },
    });

    expect(buildRequestKey(request)).toBe("203.0.113.10:vitest-agent");
  });
});
