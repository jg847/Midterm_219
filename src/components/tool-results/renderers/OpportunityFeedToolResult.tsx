import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getToolResultDataObject, tryAsObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

export type OpportunityFeedToolResultViewModel = {
  jobCount: number;
  housingCount: number;
  resourceCount: number;
  resources: Array<{
    label: string;
    note: string;
    url?: string;
  }>;
};

export function presentOpportunityFeedToolResult(result: ChatToolResult): OpportunityFeedToolResultViewModel | null {
  const data = getToolResultDataObject(result);
  if (!data) {
    return null;
  }

  const jobs = tryAsObject(data.jobs);
  const housing = tryAsObject(data.housing);
  const resources = Array.isArray(data.resources) ? data.resources : [];

  return {
    jobCount: typeof jobs?.count === "number" ? jobs.count : 0,
    housingCount: typeof housing?.count === "number" ? housing.count : 0,
    resourceCount: resources.length,
    resources: resources.slice(0, 3).map((resource) => {
      const row = tryAsObject(resource);
      return {
        label: typeof row?.label === "string" ? row.label : "Support resource",
        note: typeof row?.note === "string" ? row.note : "Open the support resource for next steps.",
        url: typeof row?.url === "string" ? row.url : undefined,
      };
    }),
  };
}

function OpportunityFeedToolResultCard(viewModel: OpportunityFeedToolResultViewModel): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">Opportunity Feed</p>
      <p className="mt-1 text-xs text-slate-700">
        Jobs: {viewModel.jobCount} | Housing: {viewModel.housingCount}
      </p>
      <p className="mt-1 text-xs text-slate-700">Resource hints: {viewModel.resourceCount}</p>
      {viewModel.resources.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {viewModel.resources.map((resource, index) => (
            <li key={index} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700">
              <p className="font-semibold text-slate-900">{resource.label}</p>
              <p className="mt-1 text-slate-600">{resource.note}</p>
              {resource.url ? <p className="mt-1 break-all text-slate-500">{resource.url}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const opportunityFeedToolResultPresenter: ToolResultPresenter<OpportunityFeedToolResultViewModel> = {
  toolName: "opportunity_feed_tool",
  present: presentOpportunityFeedToolResult,
  render: OpportunityFeedToolResultCard,
};