export const SESSION_MEMORY_ENABLED_ENV = "NEXT_PUBLIC_ENABLE_SESSION_MEMORY";
export const BROWSER_SESSION_STORAGE_KEY = "grounded-moves-session-id";
export const BROWSER_TRANSCRIPT_CACHE_KEY = "grounded-moves-session-cache";

const DEFAULT_CONVERSATION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function isSessionMemoryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SESSION_MEMORY !== "false";
}

export function getConversationTtlSeconds(): number {
  const parsed = Number(process.env.CONVERSATION_SESSION_TTL_SECONDS ?? DEFAULT_CONVERSATION_TTL_SECONDS);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CONVERSATION_TTL_SECONDS;
  }

  return Math.floor(parsed);
}

export function getConversationExpiryIso(from: Date = new Date()): string {
  return new Date(from.getTime() + getConversationTtlSeconds() * 1000).toISOString();
}

export function shouldUseRedisConversationRepository(): boolean {
  const hasRedisEnv = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!hasRedisEnv) {
    return false;
  }

  if (process.env.CONVERSATION_STORE_DRIVER === "memory") {
    return false;
  }

  if (process.env.CONVERSATION_STORE_DRIVER === "redis") {
    return true;
  }

  return process.env.NODE_ENV === "production";
}