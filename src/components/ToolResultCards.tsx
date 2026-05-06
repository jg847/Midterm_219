import type { ReactElement } from "react";

import { renderTypedToolResult } from "@/components/tool-results/registry";
import type { ChatToolResult } from "@/interface-adapters/chat/types";

type Renderer = (result: ChatToolResult) => ReactElement;

const renderers: Record<string, Renderer> = {};

function defaultRenderer(result: ChatToolResult): ReactElement {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">{result.toolName}</p>
      <p className="mt-1 text-xs text-slate-700">{result.ok ? "Completed" : `Failed: ${result.errorCode ?? "unknown"}`}</p>
    </div>
  );
}

export function ToolResultCards({
  toolResults,
  mode = "digest",
}: {
  toolResults: ChatToolResult[];
  mode?: "digest" | "all";
}) {
  if (!toolResults.length) {
    return <p className="mt-1 text-xs text-slate-500">No tool calls yet.</p>;
  }

  const digestOnly =
    toolResults.find((result) => result.toolName === "housing_digest_tool" && result.ok) ??
    toolResults.find((result) => result.toolName === "job_digest_tool" && result.ok) ??
    toolResults.find((result) => result.toolName === "ui_digest_tool" && result.ok);
  const budgetResults = toolResults.filter((result) => result.toolName === "budget_plan_tool");
  const visibleResults = mode === "digest"
    ? digestOnly
      ? [digestOnly, ...budgetResults.filter((result) => result !== digestOnly)]
      : toolResults
    : toolResults;
  const containerClass =
    mode === "digest"
      ? "mt-2 grid gap-3"
      : "mt-2 grid gap-2 sm:grid-cols-2";

  return (
    <ul className={containerClass}>
      {visibleResults.map((result) => {
        const typedResult = renderTypedToolResult(result);
        const renderer = renderers[result.toolName] ?? defaultRenderer;
        return (
          <li
            key={`${result.toolName}-${result.latencyMs}`}
            className={
              mode === "digest"
                ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                : "rounded border border-slate-200 bg-slate-50 p-2"
            }
          >
            {typedResult ?? renderer(result)}
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{result.latencyMs}ms</p>
          </li>
        );
      })}
    </ul>
  );
}
