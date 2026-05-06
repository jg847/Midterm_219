import { Redis } from "@upstash/redis";

import type {
  ConversationRecord,
  ConversationRepository,
} from "@/application/ports/ConversationRepository";
import { getConversationExpiryIso, getConversationTtlSeconds } from "@/shared/config/sessionMemory";

import { InMemoryConversationRepository } from "./InMemoryConversationRepository";

function buildConversationKey(sessionId: string): string {
  return `conversation-session:${sessionId}`;
}

export class RedisConversationRepository implements ConversationRepository {
  private readonly fallback = new InMemoryConversationRepository();

  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = getConversationTtlSeconds(),
  ) {}

  async getSession(sessionId: string): Promise<ConversationRecord | null> {
    try {
      const record = await this.redis.get<ConversationRecord>(buildConversationKey(sessionId));
      return record ?? null;
    } catch (error) {
      console.warn("[conversation-store] redis read failed, falling back to memory", error);
      return this.fallback.getSession(sessionId);
    }
  }

  async saveSession(record: ConversationRecord): Promise<void> {
    const now = new Date();
    const nextRecord: ConversationRecord = {
      ...record,
      lastActivityAt: record.lastActivityAt ?? now.toISOString(),
      expiresAt: record.expiresAt ?? getConversationExpiryIso(now),
    };

    try {
      await this.redis.set(buildConversationKey(record.sessionId), nextRecord, {
        ex: this.ttlSeconds,
      });
    } catch (error) {
      console.warn("[conversation-store] redis write failed, falling back to memory", error);
      await this.fallback.saveSession(nextRecord);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.redis.del(buildConversationKey(sessionId));
    } catch (error) {
      console.warn("[conversation-store] redis delete failed, falling back to memory", error);
      await this.fallback.deleteSession(sessionId);
    }
  }
}