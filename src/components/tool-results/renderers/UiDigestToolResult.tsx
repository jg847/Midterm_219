import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getStringArray, getToolResultDataObject, tryAsObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

type UiDigestCardViewModel = {
  title: string;
  lines: string[];
};

export type UiDigestToolResultViewModel = {
  headline: string;
  keyStats: Array<{ label: string; value: string }>;
  topActions: string[];
  warnings: string[];
  cards: UiDigestCardViewModel[];
};

export function presentUiDigestToolResult(result: ChatToolResult): UiDigestToolResultViewModel | null {
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
          if (!row) {
            return null;
          }

          return {
            title: String(row.title ?? "Section"),
            lines: getStringArray(row.lines),
          } satisfies UiDigestCardViewModel;
        })
        .filter((card): card is UiDigestCardViewModel => card !== null)
    : [];

  return {
    headline: String(data.headline ?? "No summary available."),
    keyStats,
    topActions: getStringArray(data.topActions),
    warnings: getStringArray(data.warnings),
    cards,
  };
}

function UiDigestToolResultCard(viewModel: UiDigestToolResultViewModel): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">Affordability Snapshot</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{viewModel.headline}</p>

      {viewModel.keyStats.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {viewModel.keyStats.slice(0, 4).map((item, index) => (
            <li key={index} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700">
              <p className="font-semibold text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {viewModel.cards.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {viewModel.cards.slice(0, 2).map((card, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-800">{card.title}</p>
              {card.lines.slice(0, 3).map((line, lineIndex) => (
                <p key={lineIndex} className="mt-1 leading-5">{line}</p>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {viewModel.topActions.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-700">
          {viewModel.topActions.slice(0, 3).map((action, index) => (
            <li key={index}>{action}</li>
          ))}
        </ul>
      ) : null}

      {viewModel.warnings.length > 0 ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          {viewModel.warnings[0]}
        </p>
      ) : null}
    </div>
  );
}

export const uiDigestToolResultPresenter: ToolResultPresenter<UiDigestToolResultViewModel> = {
  toolName: "ui_digest_tool",
  present: presentUiDigestToolResult,
  render: UiDigestToolResultCard,
};