import { afterEach, describe, expect, it, vi } from "vitest";

import { getOperationalStateStoreMode, shouldUseRedisOperationalStateStore } from "@/shared/config/operationalState";

describe("operational state config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses memory when redis credentials are absent", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    expect(shouldUseRedisOperationalStateStore()).toBe(false);
    expect(getOperationalStateStoreMode()).toBe("memory");
  });

  it("allows an explicit memory override in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubEnv("OPERATIONAL_STATE_DRIVER", "memory");

    expect(shouldUseRedisOperationalStateStore()).toBe(false);
    expect(getOperationalStateStoreMode()).toBe("memory");
  });

  it("allows redis to be forced outside production when credentials are present", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubEnv("OPERATIONAL_STATE_DRIVER", "redis");

    expect(shouldUseRedisOperationalStateStore()).toBe(true);
    expect(getOperationalStateStoreMode()).toBe("redis");
  });
});