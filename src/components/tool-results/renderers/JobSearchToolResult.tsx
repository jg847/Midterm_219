import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getToolResultDataObject, tryAsObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

type JobSearchListingViewModel = {
  title: string;
  company: string;
  location: string;
};

export type JobSearchToolResultViewModel = {
  listingCount: number;
  listings: JobSearchListingViewModel[];
};

export function presentJobSearchToolResult(result: ChatToolResult): JobSearchToolResultViewModel | null {
  const data = getToolResultDataObject(result);
  if (!data) {
    return null;
  }

  const listings = Array.isArray(data.listings)
    ? data.listings
        .map((item) => {
          const row = tryAsObject(item);
          if (!row) {
            return null;
          }

          return {
            title: String(row.title ?? "Unknown role"),
            company: String(row.company ?? "Unknown org"),
            location: String(row.location ?? "Unknown"),
          } satisfies JobSearchListingViewModel;
        })
        .filter((listing): listing is JobSearchListingViewModel => listing !== null)
    : [];

  return {
    listingCount: listings.length,
    listings,
  };
}

function JobSearchToolResultCard(viewModel: JobSearchToolResultViewModel): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">Job Results ({viewModel.listingCount})</p>
      <ul className="mt-2 grid gap-2">
        {viewModel.listings.slice(0, 3).map((listing, index) => (
          <li key={index} className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <p className="font-semibold">{listing.title}</p>
            <p>{listing.company} - {listing.location}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const jobSearchToolResultPresenter: ToolResultPresenter<JobSearchToolResultViewModel> = {
  toolName: "job_search_tool",
  present: presentJobSearchToolResult,
  render: JobSearchToolResultCard,
};