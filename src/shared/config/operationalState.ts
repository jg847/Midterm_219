export const OPERATIONAL_STATE_DRIVER_ENV = "OPERATIONAL_STATE_DRIVER";

export type OperationalStateStoreMode = "memory" | "redis";

export function shouldUseRedisOperationalStateStore(): boolean {
  const hasRedisEnv = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!hasRedisEnv) {
    return false;
  }

  if (process.env.OPERATIONAL_STATE_DRIVER === "memory") {
    return false;
  }

  if (process.env.OPERATIONAL_STATE_DRIVER === "redis") {
    return true;
  }

  return process.env.NODE_ENV === "production";
}

export function getOperationalStateStoreMode(): OperationalStateStoreMode {
  return shouldUseRedisOperationalStateStore() ? "redis" : "memory";
}