import { afterEach, describe, expect, it, vi } from "vitest";

import { shouldUseRedisConversationRepository } from "@/shared/config/sessionMemory";

describe("session memory config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses in-memory storage when redis credentials are absent", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    expect(shouldUseRedisConversationRepository()).toBe(false);
  });

  it("allows an explicit in-memory override even in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubEnv("CONVERSATION_STORE_DRIVER", "memory");

    expect(shouldUseRedisConversationRepository()).toBe(false);
  });

  it("allows redis to be forced outside production when credentials are present", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubEnv("CONVERSATION_STORE_DRIVER", "redis");

    expect(shouldUseRedisConversationRepository()).toBe(true);
  });
});