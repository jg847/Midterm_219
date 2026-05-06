import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getStringArray, getToolResultDataObject, tryAsObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

type JobDigestCardViewModel = {
  variant: "listing" | "fallback";
  title: string;
  company: string;
  location: string;
  salaryLabel: string;
  actions: Array<{
    label: string;
    url: string;
  }>;
};

export type JobDigestToolResultViewModel = {
  summary: string;
  keyStats: Array<{ label: string; value: string }>;
  cards: JobDigestCardViewModel[];
  warnings: string[];
};

export function presentJobDigestToolResult(result: ChatToolResult): JobDigestToolResultViewModel | null {
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

          return {
            variant: row.variant === "fallback" ? "fallback" : "listing",
            title: String(row.title ?? "Unknown role"),
            company: String(row.company ?? "Unknown org"),
            location: String(row.location ?? "Unknown"),
            salaryLabel: String(row.salaryLabel ?? "Salary not listed"),
            actions,
          } satisfies JobDigestCardViewModel;
        })
        .filter((card): card is JobDigestCardViewModel => card !== null)
    : [];

  return {
    summary: String(data.summary ?? data.headline ?? "No job summary available."),
    keyStats,
    cards,
    warnings: getStringArray(data.warnings),
  };
}

function JobDigestToolResultCard(viewModel: JobDigestToolResultViewModel): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">Job Summary</p>
      <p className="mt-1 text-xs text-slate-700">{viewModel.summary}</p>

      {viewModel.keyStats.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {viewModel.keyStats.slice(0, 3).map((item, index) => (
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
            <li
              key={index}
              className={
                card.variant === "fallback"
                  ? "rounded-2xl border border-[#d9cfb5] bg-[#fff9ee] p-3 shadow-sm"
                  : "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              }
            >
              <p className="text-sm font-semibold text-slate-900">{card.title}</p>
              <p className="mt-1 text-xs text-slate-600">{card.company} · {card.location}</p>
              <p className="mt-2 text-xs font-medium text-slate-700">{card.salaryLabel}</p>

              {card.actions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.actions.map((action, actionIndex) => (
                    <a
                      key={actionIndex}
                      href={action.url}
                      target="_blank"
                      rel="noreferrer"
                      className={
                        card.variant === "fallback"
                          ? "rounded-full border border-[#2e6f78] bg-[#edf8f7] px-3 py-1.5 text-xs font-medium text-[#17464d]"
                          : "rounded-full bg-[#17464d] px-3 py-1.5 text-xs font-medium text-white"
                      }
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

export const jobDigestToolResultPresenter: ToolResultPresenter<JobDigestToolResultViewModel> = {
  toolName: "job_digest_tool",
  present: presentJobDigestToolResult,
  render: JobDigestToolResultCard,
};