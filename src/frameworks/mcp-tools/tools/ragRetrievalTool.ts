import { LocalSeedRetrievalRepository } from "@/frameworks/repositories/LocalSeedRetrievalRepository";
import { createTelemetry } from "@/frameworks/telemetry/createTelemetry";
import { RagRetrievalInputSchema, type RagRetrievalInput } from "@/shared/schemas/toolContracts";

import { ok } from "../toolUtils";
import type { ToolDefinition } from "../types";

type RagRetrievalOutput = {
  retrievalMode: "local_seed_fallback" | "external_production";
  disclosure: string;
  chunks: Array<{ id: string; documentId: string; content: string; score: number }>;
};

const repository = new LocalSeedRetrievalRepository();
const telemetry = createTelemetry();

export const ragRetrievalTool: ToolDefinition<RagRetrievalInput, RagRetrievalOutput> = {
  name: "rag_retrieval_tool",
  description: "Retrieve relevant story chunks and disclose whether results came from local seed fallback or real external retrieval.",
  inputSchema: RagRetrievalInputSchema,
  async execute(input) {
    const result = await repository.search(input.query, input.limit);

    telemetry.track({
      name: "chat.retrieval.executed",
      attributes: {
        toolName: "rag_retrieval_tool",
        retrievalMode: result.mode,
        resultCount: result.chunks.length,
      },
    });

    return ok({
      retrievalMode: result.mode,
      disclosure: result.disclosure,
      chunks: result.chunks,
    });
  },
};
