import { Redis } from "@upstash/redis";

import type { ConversationRepository } from "@/application/ports/ConversationRepository";
import {
  getConversationTtlSeconds,
  shouldUseRedisConversationRepository,
} from "@/shared/config/sessionMemory";

import { InMemoryConversationRepository } from "./InMemoryConversationRepository";
import { RedisConversationRepository } from "./RedisConversationRepository";

let repository: ConversationRepository | null = null;

export function createConversationRepository(): ConversationRepository {
  if (repository) {
    return repository;
  }

  if (shouldUseRedisConversationRepository()) {
    repository = new RedisConversationRepository(
      new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      getConversationTtlSeconds(),
    );

    return repository;
  }

  repository = new InMemoryConversationRepository();
  return repository;
}