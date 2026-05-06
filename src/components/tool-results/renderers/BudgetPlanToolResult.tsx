import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { getStringArray, getToolResultDataObject, tryAsObject } from "../presenterUtils";
import type { ToolResultPresenter } from "../types";

export type BudgetPlanToolResultViewModel = {
  verdictLabel: string;
  verdictToneClass: string;
  monthlyNetPositionLabel: string;
  burdenLabel?: string;
  marketUsed?: string;
  categoryEntries: Array<{ key: string; valueLabel: string }>;
  guidance: string[];
  missingFields: string[];
};

export function presentBudgetPlanToolResult(result: ChatToolResult): BudgetPlanToolResultViewModel | null {
  const data = getToolResultDataObject(result);
  if (!data) {
    return null;
  }

  const verdict = typeof data.verdict === "string" ? data.verdict : "unknown";
  const categoryBreakdown = tryAsObject(data.categoryBreakdown);
  const locationResolution = tryAsObject(data.locationResolution);
  const burdenPct = typeof data.burdenPct === "number" ? data.burdenPct : null;
  const monthlyNetPosition = typeof data.monthlyNetPosition === "number" ? data.monthlyNetPosition : null;

  const verdictToneClass = verdict === "safe"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : verdict === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  const categoryEntries = Object.entries(categoryBreakdown ?? {})
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => ({ key, valueLabel: `$${Number(value).toFixed(2)}` }));

  return {
    verdictLabel: verdict.replaceAll("_", " "),
    verdictToneClass,
    monthlyNetPositionLabel: monthlyNetPosition === null ? "N/A" : `$${monthlyNetPosition.toFixed(2)}`,
    burdenLabel: burdenPct === null ? undefined : `${burdenPct.toFixed(2)}%`,
    marketUsed: typeof locationResolution?.resolvedLabel === "string" ? locationResolution.resolvedLabel : undefined,
    categoryEntries,
    guidance: getStringArray(data.guidance).slice(0, 3),
    missingFields: getStringArray(data.missingFields).slice(0, 3),
  };
}

function BudgetPlanToolResultCard(viewModel: BudgetPlanToolResultViewModel): ReactElement {
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Budget Fit</p>
          <p className="mt-1 text-xs text-slate-700">
            Monthly net position: {viewModel.monthlyNetPositionLabel}
          </p>
          {viewModel.burdenLabel ? (
            <p className="mt-1 text-xs text-slate-700">Housing burden: {viewModel.burdenLabel}</p>
          ) : null}
        </div>
        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium uppercase ${viewModel.verdictToneClass}`}>
          {viewModel.verdictLabel}
        </span>
      </div>

      {viewModel.marketUsed ? (
        <p className="mt-2 text-[11px] text-slate-500">Market used: {viewModel.marketUsed}</p>
      ) : null}

      {viewModel.categoryEntries.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {viewModel.categoryEntries.slice(0, 6).map((entry) => (
            <li key={entry.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700">
              <p className="font-semibold text-slate-500">{entry.key}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{entry.valueLabel}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {viewModel.guidance.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-700">
          {viewModel.guidance.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null}

      {viewModel.missingFields.length > 0 ? (
        <p className="mt-3 text-[11px] text-amber-700">
          Missing inputs: {viewModel.missingFields.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export const budgetPlanToolResultPresenter: ToolResultPresenter<BudgetPlanToolResultViewModel> = {
  toolName: "budget_plan_tool",
  present: presentBudgetPlanToolResult,
  render: BudgetPlanToolResultCard,
};