import { Redis } from "@upstash/redis";

import type {
  ConversationRecord,
  ConversationRepository,
} from "@/application/ports/ConversationRepository";
import { getConversationExpiryIso, getConversationTtlSeconds } from "@/shared/config/sessionMemory";

function buildConversationKey(sessionId: string): string {
  return `conversation-session:${sessionId}`;
}

export class RedisConversationRepository implements ConversationRepository {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = getConversationTtlSeconds(),
  ) {}

  async getSession(sessionId: string): Promise<ConversationRecord | null> {
    const record = await this.redis.get<ConversationRecord>(buildConversationKey(sessionId));
    return record ?? null;
  }

  async saveSession(record: ConversationRecord): Promise<void> {
    const now = new Date();
    const nextRecord: ConversationRecord = {
      ...record,
      lastActivityAt: record.lastActivityAt ?? now.toISOString(),
      expiresAt: record.expiresAt ?? getConversationExpiryIso(now),
    };

    await this.redis.set(buildConversationKey(record.sessionId), nextRecord, {
      ex: this.ttlSeconds,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(buildConversationKey(sessionId));
  }
}