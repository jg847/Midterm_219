import type {
  ConversationRecord,
  ConversationRepository,
} from "@/application/ports/ConversationRepository";

const memoryStore = new Map<string, ConversationRecord>();

export class InMemoryConversationRepository implements ConversationRepository {
  async getSession(sessionId: string): Promise<ConversationRecord | null> {
    return memoryStore.get(sessionId) ?? null;
  }

  async saveSession(record: ConversationRecord): Promise<void> {
    memoryStore.set(record.sessionId, record);
  }

  async deleteSession(sessionId: string): Promise<void> {
    memoryStore.delete(sessionId);
  }

  static clear(): void {
    memoryStore.clear();
  }
}
