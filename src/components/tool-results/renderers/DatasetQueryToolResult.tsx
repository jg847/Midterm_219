import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getToolResultDataObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

export type DatasetQueryToolResultViewModel = {
  location: string;
  metric: string;
  disclosure?: string;
};

export function presentDatasetQueryToolResult(result: ChatToolResult): DatasetQueryToolResultViewModel | null {
  const data = getToolResultDataObject(result);
  if (!data) {
    return null;
  }

  return {
    location: String(data.location ?? "unknown"),
    metric: String(data.metric ?? "unknown"),
    disclosure: typeof data.disclosure === "string" ? data.disclosure : undefined,
  };
}

function DatasetQueryToolResultCard(viewModel: DatasetQueryToolResultViewModel): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">Dataset Insight</p>
      <p className="mt-1 text-xs text-slate-700">Benchmark: {viewModel.location}</p>
      <p className="mt-1 text-xs text-slate-700">Metric: {viewModel.metric}</p>
      {viewModel.disclosure ? (
        <p className="mt-1 text-[11px] text-slate-500">{viewModel.disclosure}</p>
      ) : null}
    </div>
  );
}

export const datasetQueryToolResultPresenter: ToolResultPresenter<DatasetQueryToolResultViewModel> = {
  toolName: "dataset_query_tool",
  present: presentDatasetQueryToolResult,
  render: DatasetQueryToolResultCard,
};