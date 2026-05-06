import { Redis } from "@upstash/redis";

import { shouldUseRedisOperationalStateStore } from "@/shared/config/operationalState";

import type { OperationalStateStore } from "./OperationalStateStore";
import { InMemoryOperationalStateStore } from "./InMemoryOperationalStateStore";
import { RedisOperationalStateStore } from "./RedisOperationalStateStore";

let store: OperationalStateStore | null = null;

export function createOperationalStateStore(): OperationalStateStore {
  if (store) {
    return store;
  }

  if (shouldUseRedisOperationalStateStore()) {
    store = new RedisOperationalStateStore(
      new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
    );

    return store;
  }

  store = new InMemoryOperationalStateStore();
  return store;
}

export function resetOperationalStateStoreForTests(): void {
  store = null;
}