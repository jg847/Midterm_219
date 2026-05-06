import type { RetrievalRepository, RetrievalSearchResult } from "@/application/ports/RetrievalRepository";
import retrievalSeed from "../../../data/seeds/story-chunks.seed.json";

const DEFAULT_CHUNKS = retrievalSeed as RetrievalSearchResult["chunks"];

export class LocalSeedRetrievalRepository implements RetrievalRepository {
  async search(query: string, limit: number): Promise<RetrievalSearchResult> {
    const q = query.toLowerCase();

    return {
      mode: "local_seed_fallback",
      disclosure: "Approximate local seed match, not live external retrieval.",
      chunks: DEFAULT_CHUNKS.filter((chunk) => chunk.content.toLowerCase().includes(q)).slice(0, limit),
    };
  }
}