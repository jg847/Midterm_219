import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getToolResultDataObject, tryAsObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

type HousingListingViewModel = {
  formattedAddress: string;
  rentLabel: string;
};

export type HousingSearchToolResultViewModel = {
  listingCount: number;
  listings: HousingListingViewModel[];
  fallbackMessage?: string;
  fallbackReason?: string;
};

export function presentHousingSearchToolResult(result: ChatToolResult): HousingSearchToolResultViewModel | null {
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
            formattedAddress: String(row.formattedAddress ?? "Unknown address"),
            rentLabel: `$${String(row.rent ?? "N/A")}/month`,
          } satisfies HousingListingViewModel;
        })
        .filter((listing): listing is HousingListingViewModel => listing !== null)
    : [];

  const fallback = tryAsObject(data.fallback);
  const locationResolution = tryAsObject(data.locationResolution);
  const fallbackLocation = String(fallback?.location ?? locationResolution?.resolvedLabel ?? "fallback market");
  const fallbackMonthly = fallback?.fmrMonthly ?? "N/A";

  return {
    listingCount: listings.length,
    listings,
    fallbackMessage: listings.length > 0
      ? undefined
      : fallback
        ? `No listings available from RentCast. Housing benchmark (${fallbackLocation}): $${String(fallbackMonthly)}.`
        : undefined,
    fallbackReason: typeof locationResolution?.fallbackReason === "string" ? locationResolution.fallbackReason : undefined,
  };
}

function HousingSearchToolResultCard(viewModel: HousingSearchToolResultViewModel): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">Housing Results ({viewModel.listingCount})</p>
      {viewModel.listings.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {viewModel.listings.slice(0, 3).map((listing, index) => (
            <li key={index} className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <p className="font-semibold">{listing.formattedAddress}</p>
              <p>{listing.rentLabel}</p>
            </li>
          ))}
        </ul>
      ) : viewModel.fallbackMessage ? (
        <div className="mt-2 space-y-1 text-xs text-amber-700">
          <p>{viewModel.fallbackMessage}</p>
          {viewModel.fallbackReason ? <p className="text-[11px] text-slate-500">{viewModel.fallbackReason}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export const housingSearchToolResultPresenter: ToolResultPresenter<HousingSearchToolResultViewModel> = {
  toolName: "housing_search_tool",
  present: presentHousingSearchToolResult,
  render: HousingSearchToolResultCard,
};