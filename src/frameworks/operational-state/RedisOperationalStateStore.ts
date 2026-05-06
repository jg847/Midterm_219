import { Redis } from "@upstash/redis";

import type { OperationalStateStore } from "./OperationalStateStore";

export class RedisOperationalStateStore implements OperationalStateStore {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, { ex: ttlSeconds });
      return;
    }

    await this.redis.set(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    // Redis-backed operational state is intentionally not bulk-cleared here.
  }
}