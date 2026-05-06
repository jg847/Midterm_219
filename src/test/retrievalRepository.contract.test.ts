import { describe, expect, it } from "vitest";

import type { RetrievalRepository } from "@/application/ports/RetrievalRepository";
import { LocalSeedRetrievalRepository } from "@/frameworks/repositories/LocalSeedRetrievalRepository";

class ProductionRetrievalRepositoryStub implements RetrievalRepository {
  async search(): Promise<{
    mode: "external_production";
    disclosure: string;
    chunks: [];
  }> {
    return {
      mode: "external_production",
      disclosure: "Live external retrieval results.",
      chunks: [],
    };
  }
}

describe("retrieval repository contract", () => {
  it("discloses local seed fallback mode truthfully", async () => {
    const repository = new LocalSeedRetrievalRepository();

    const result = await repository.search("rent burden", 2);

    expect(result.mode).toBe("local_seed_fallback");
    expect(result.disclosure).toBe("Approximate local seed match, not live external retrieval.");
    expect(result.chunks.length).toBeLessThanOrEqual(2);
  });

  it("keeps the port compatible with a future production retrieval adapter", async () => {
    const repository: RetrievalRepository = new ProductionRetrievalRepositoryStub();

    const result = await repository.search("rent burden", 2);

    expect(result).toEqual({
      mode: "external_production",
      disclosure: "Live external retrieval results.",
      chunks: [],
    });
  });
});