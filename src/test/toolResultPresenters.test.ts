import { describe, expect, it } from "vitest";

import { presentBudgetPlanToolResult } from "@/components/tool-results/renderers/BudgetPlanToolResult";
import { presentDatasetQueryToolResult } from "@/components/tool-results/renderers/DatasetQueryToolResult";
import { presentHousingDigestToolResult } from "@/components/tool-results/renderers/HousingDigestToolResult";
import { presentHousingSearchToolResult } from "@/components/tool-results/renderers/HousingSearchToolResult";
import { presentJobDigestToolResult } from "@/components/tool-results/renderers/JobDigestToolResult";
import { presentJobSearchToolResult } from "@/components/tool-results/renderers/JobSearchToolResult";
import { presentOpportunityFeedToolResult } from "@/components/tool-results/renderers/OpportunityFeedToolResult";
import { presentRagRetrievalToolResult } from "@/components/tool-results/renderers/RagRetrievalToolResult";
import { presentUiDigestToolResult } from "@/components/tool-results/renderers/UiDigestToolResult";

describe("tool result presenters", () => {
  it("maps retrieval results to a typed view model", () => {
    const viewModel = presentRagRetrievalToolResult({
      toolName: "rag_retrieval_tool",
      ok: true,
      latencyMs: 8,
      payload: {
        ok: true,
        data: {
          retrievalMode: "local_seed_fallback",
          disclosure: "Approximate local seed match, not live external retrieval.",
          chunks: [{ id: "c1" }],
        },
      },
    });

    expect(viewModel).toEqual({
      retrievalMode: "local_seed_fallback",
      disclosure: "Approximate local seed match, not live external retrieval.",
      chunkCount: 1,
    });
  });

  it("maps budget results to a typed view model", () => {
    const viewModel = presentBudgetPlanToolResult({
      toolName: "budget_plan_tool",
      ok: true,
      latencyMs: 12,
      payload: {
        ok: true,
        data: {
          verdict: "warning",
          monthlyNetPosition: -125.5,
          burdenPct: 41.2,
          categoryBreakdown: { housing: 1800, food: 450 },
          guidance: ["Reduce housing costs", "Increase income"],
          missingFields: ["utilities"],
          locationResolution: { resolvedLabel: "Austin, TX" },
        },
      },
    });

    expect(viewModel).toEqual({
      verdictLabel: "warning",
      verdictToneClass: "border-amber-200 bg-amber-50 text-amber-700",
      monthlyNetPositionLabel: "$-125.50",
      burdenLabel: "41.20%",
      marketUsed: "Austin, TX",
      categoryEntries: [
        { key: "housing", valueLabel: "$1800.00" },
        { key: "food", valueLabel: "$450.00" },
      ],
      guidance: ["Reduce housing costs", "Increase income"],
      missingFields: ["utilities"],
    });
  });

  it("maps opportunity feed results to a typed view model", () => {
    const viewModel = presentOpportunityFeedToolResult({
      toolName: "opportunity_feed_tool",
      ok: true,
      latencyMs: 20,
      payload: {
        ok: true,
        data: {
          jobs: { count: 2 },
          housing: { count: 1 },
          resources: [
            { label: "Rental help", note: "Call 211", url: "https://example.org/help" },
          ],
        },
      },
    });

    expect(viewModel).toEqual({
      jobCount: 2,
      housingCount: 1,
      resourceCount: 1,
      resources: [
        { label: "Rental help", note: "Call 211", url: "https://example.org/help" },
      ],
    });
  });

  it("maps job digest results to a typed view model", () => {
    const viewModel = presentJobDigestToolResult({
      toolName: "job_digest_tool",
      ok: true,
      latencyMs: 14,
      payload: {
        ok: true,
        data: {
          summary: "Found 2 openings.",
          keyStats: [{ label: "Openings", value: "2" }],
          cards: [
            {
              variant: "listing",
              title: "Data Analyst",
              company: "City of Austin",
              location: "Austin, TX",
              salaryLabel: "$60,000-$70,000",
              actions: [{ label: "Open listing", url: "https://example.org/job" }],
            },
          ],
          warnings: [],
        },
      },
    });

    expect(viewModel).toEqual({
      summary: "Found 2 openings.",
      keyStats: [{ label: "Openings", value: "2" }],
      cards: [
        {
          variant: "listing",
          title: "Data Analyst",
          company: "City of Austin",
          location: "Austin, TX",
          salaryLabel: "$60,000-$70,000",
          actions: [{ label: "Open listing", url: "https://example.org/job" }],
        },
      ],
      warnings: [],
    });
  });

  it("maps housing digest results to a typed view model", () => {
    const viewModel = presentHousingDigestToolResult({
      toolName: "housing_digest_tool",
      ok: true,
      latencyMs: 19,
      payload: {
        ok: true,
        data: {
          summary: "Found 1 rental option.",
          keyStats: [{ label: "Listings", value: "1" }],
          cards: [
            {
              title: "123 Main St",
              rentLabel: "$1400/month",
              details: ["1 bd / 1 ba"],
              affordability: {
                label: "Affordable",
                tone: "good",
                detail: "$200 below benchmark",
              },
              actions: [{ label: "View on Zillow", url: "https://example.org/home" }],
            },
          ],
          warnings: ["Benchmark fallback in use"],
        },
      },
    });

    expect(viewModel).toEqual({
      summary: "Found 1 rental option.",
      keyStats: [{ label: "Listings", value: "1" }],
      cards: [
        {
          title: "123 Main St",
          rentLabel: "$1400/month",
          details: ["1 bd / 1 ba"],
          affordability: {
            label: "Affordable",
            toneClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
            detail: "$200 below benchmark",
          },
          actions: [{ label: "View on Zillow", url: "https://example.org/home" }],
        },
      ],
      warnings: ["Benchmark fallback in use"],
    });
  });

  it("maps ui digest results to a typed view model", () => {
    const viewModel = presentUiDigestToolResult({
      toolName: "ui_digest_tool",
      ok: true,
      latencyMs: 11,
      payload: {
        ok: true,
        data: {
          headline: "Side-by-side affordability scan.",
          keyStats: [{ label: "Jobs", value: "3" }],
          topActions: ["Apply this week"],
          warnings: ["No live rentals were returned in this run."],
          cards: [{ title: "Jobs Snapshot", lines: ["3 matching openings surfaced"] }],
        },
      },
    });

    expect(viewModel).toEqual({
      headline: "Side-by-side affordability scan.",
      keyStats: [{ label: "Jobs", value: "3" }],
      topActions: ["Apply this week"],
      warnings: ["No live rentals were returned in this run."],
      cards: [{ title: "Jobs Snapshot", lines: ["3 matching openings surfaced"] }],
    });
  });

  it("maps job search results to a typed view model", () => {
    const viewModel = presentJobSearchToolResult({
      toolName: "job_search_tool",
      ok: true,
      latencyMs: 9,
      payload: {
        ok: true,
        data: {
          listings: [
            { title: "Analyst", company: "County", location: "Austin, TX" },
          ],
        },
      },
    });

    expect(viewModel).toEqual({
      listingCount: 1,
      listings: [{ title: "Analyst", company: "County", location: "Austin, TX" }],
    });
  });

  it("maps housing search results to a typed view model", () => {
    const viewModel = presentHousingSearchToolResult({
      toolName: "housing_search_tool",
      ok: true,
      latencyMs: 10,
      payload: {
        ok: true,
        data: {
          listings: [],
          fallback: { location: "Austin MSA", fmrMonthly: 1700 },
          locationResolution: { fallbackReason: "State benchmark fallback" },
        },
      },
    });

    expect(viewModel).toEqual({
      listingCount: 0,
      listings: [],
      fallbackMessage: "No listings available from RentCast. Housing benchmark (Austin MSA): $1700.",
      fallbackReason: "State benchmark fallback",
    });
  });

  it("maps dataset query results to a typed view model", () => {
    const viewModel = presentDatasetQueryToolResult({
      toolName: "dataset_query_tool",
      ok: true,
      latencyMs: 7,
      payload: {
        ok: true,
        data: {
          location: "Reference affordability benchmark",
          metric: "livingWage",
          disclosure: "Reference seed benchmark, not a live market feed.",
        },
      },
    });

    expect(viewModel).toEqual({
      location: "Reference affordability benchmark",
      metric: "livingWage",
      disclosure: "Reference seed benchmark, not a live market feed.",
    });
  });
});