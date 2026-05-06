import { Redis } from "@upstash/redis";

import type { OperationalStateStore } from "./OperationalStateStore";
import { InMemoryOperationalStateStore } from "./InMemoryOperationalStateStore";

export class RedisOperationalStateStore implements OperationalStateStore {
  private readonly fallback = new InMemoryOperationalStateStore();

  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get<T>(key);
      return value ?? null;
    } catch (error) {
      console.warn("[operational-state] redis get failed, falling back to memory", error);
      return this.fallback.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.redis.set(key, value, { ex: ttlSeconds });
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.warn("[operational-state] redis set failed, falling back to memory", error);
      await this.fallback.set(key, value, ttlSeconds);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn("[operational-state] redis delete failed, falling back to memory", error);
      await this.fallback.delete(key);
    }
  }

  async clear(): Promise<void> {
    await this.fallback.clear();
  }
}