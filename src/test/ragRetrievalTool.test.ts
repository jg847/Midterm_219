import { describe, expect, it, vi } from "vitest";

const { telemetryTrackMock } = vi.hoisted(() => ({
  telemetryTrackMock: vi.fn(),
}));

vi.mock("@/frameworks/telemetry/createTelemetry", () => ({
  createTelemetry: () => ({
    track: telemetryTrackMock,
  }),
}));

import { ragRetrievalTool } from "@/frameworks/mcp-tools/tools/ragRetrievalTool";

describe("ragRetrievalTool", () => {
  it("supports empty successful retrieval results", async () => {
    const result = await ragRetrievalTool.execute({ query: "no-match-token", limit: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.retrievalMode).toBe("local_seed_fallback");
      expect(result.data.disclosure).toBe("Approximate local seed match, not live external retrieval.");
      expect(result.data.chunks).toEqual([]);
    }

    expect(telemetryTrackMock).toHaveBeenCalledWith({
      name: "chat.retrieval.executed",
      attributes: {
        toolName: "rag_retrieval_tool",
        retrievalMode: "local_seed_fallback",
        resultCount: 0,
      },
    });
  });
});
