import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getStringArray, getToolResultDataObject, tryAsObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

type HousingDigestCardViewModel = {
  title: string;
  rentLabel: string;
  details: string[];
  affordability: {
    label: string;
    toneClass: string;
    detail: string;
  };
  actions: Array<{
    label: string;
    url: string;
  }>;
};

export type HousingDigestToolResultViewModel = {
  summary: string;
  keyStats: Array<{ label: string; value: string }>;
  cards: HousingDigestCardViewModel[];
  warnings: string[];
};

export function presentHousingDigestToolResult(result: ChatToolResult): HousingDigestToolResultViewModel | null {
  const data = getToolResultDataObject(result);
  if (!data) {
    return null;
  }

  const keyStats = Array.isArray(data.keyStats)
    ? data.keyStats
        .map((item) => {
          const row = tryAsObject(item);
          if (!row) {
            return null;
          }

          return {
            label: String(row.label ?? "Metric"),
            value: String(row.value ?? "N/A"),
          };
        })
        .filter((item): item is { label: string; value: string } => item !== null)
    : [];

  const cards = Array.isArray(data.cards)
    ? data.cards
        .map((item) => {
          const row = tryAsObject(item);
          const affordability = tryAsObject(row?.affordability);
          if (!row || !affordability) {
            return null;
          }

          const actions = Array.isArray(row.actions)
            ? row.actions
                .map((action) => {
                  const link = tryAsObject(action);
                  if (!link || typeof link.label !== "string" || typeof link.url !== "string") {
                    return null;
                  }

                  return { label: link.label, url: link.url };
                })
                .filter((action): action is { label: string; url: string } => action !== null)
            : [];

          const toneClass = affordability.tone === "good"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200";

          return {
            title: String(row.title ?? "Unknown address"),
            rentLabel: String(row.rentLabel ?? "Rent unavailable"),
            details: getStringArray(row.details),
            affordability: {
              label: String(affordability.label ?? "Unknown"),
              toneClass,
              detail: String(affordability.detail ?? ""),
            },
            actions,
          } satisfies HousingDigestCardViewModel;
        })
        .filter((card): card is HousingDigestCardViewModel => card !== null)
    : [];

  return {
    summary: String(data.summary ?? data.headline ?? "No rental summary available."),
    keyStats,
    cards,
    warnings: getStringArray(data.warnings),
  };
}

function HousingDigestToolResultCard(viewModel: HousingDigestToolResultViewModel): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">Rental Summary</p>
      <p className="mt-1 text-xs text-slate-700">{viewModel.summary}</p>

      {viewModel.keyStats.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {viewModel.keyStats.slice(0, 4).map((item, index) => (
            <li key={index} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700">
              <p className="font-semibold text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {viewModel.cards.length > 0 ? (
        <ul className="mt-3 grid gap-3">
          {viewModel.cards.map((card, index) => (
            <li key={index} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{card.rentLabel}</p>
                </div>
                <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${card.affordability.toneClass}`}>
                  {card.affordability.label}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {card.details.map((line, lineIndex) => (
                  <p key={lineIndex}>{line}</p>
                ))}
                <p className="font-medium">{card.affordability.detail}</p>
              </div>

              {card.actions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.actions.map((action, actionIndex) => (
                    <a
                      key={actionIndex}
                      href={action.url}
                      target="_blank"
                      rel="noreferrer"
                      className={actionIndex === 0
                        ? "rounded-full bg-[#17464d] px-3 py-1.5 text-xs font-medium text-white"
                        : "rounded-full border border-[#2e6f78] bg-[#edf8f7] px-3 py-1.5 text-xs font-medium text-[#17464d]"}
                    >
                      {action.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {viewModel.warnings.length > 0 ? (
        <p className="mt-3 text-[11px] text-amber-700">{viewModel.warnings[0]}</p>
      ) : null}
    </div>
  );
}

export const housingDigestToolResultPresenter: ToolResultPresenter<HousingDigestToolResultViewModel> = {
  toolName: "housing_digest_tool",
  present: presentHousingDigestToolResult,
  render: HousingDigestToolResultCard,
};