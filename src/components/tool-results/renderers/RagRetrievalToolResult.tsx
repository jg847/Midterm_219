import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getToolResultDataObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

export type RagRetrievalToolResultViewModel = {
  retrievalMode: string;
  chunkCount: number;
  disclosure?: string;
};

export function presentRagRetrievalToolResult(result: ChatToolResult): RagRetrievalToolResultViewModel | null {
  const data = getToolResultDataObject(result);
  if (!data) {
    return null;
  }

  return {
    retrievalMode: typeof data.retrievalMode === "string" ? data.retrievalMode : "unknown",
    chunkCount: Array.isArray(data.chunks) ? data.chunks.length : 0,
    disclosure: typeof data.disclosure === "string" ? data.disclosure : undefined,
  };
}

function RagRetrievalToolResultCard(viewModel: RagRetrievalToolResultViewModel): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">Retrieval Context</p>
      <p className="mt-1 text-xs text-slate-700">Mode: {viewModel.retrievalMode}</p>
      <p className="mt-1 text-xs text-slate-700">Chunks returned: {viewModel.chunkCount}</p>
      {viewModel.disclosure ? <p className="mt-1 text-[11px] text-slate-500">{viewModel.disclosure}</p> : null}
    </div>
  );
}

export const ragRetrievalToolResultPresenter: ToolResultPresenter<RagRetrievalToolResultViewModel> = {
  toolName: "rag_retrieval_tool",
  present: presentRagRetrievalToolResult,
  render: RagRetrievalToolResultCard,
};