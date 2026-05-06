import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ToolResultCards } from "@/components/ToolResultCards";

describe("ToolResultCards", () => {
  it("renders truthful retrieval fallback disclosure for retrieval tool results", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ToolResultCards, {
        mode: "all",
        toolResults: [
          {
            toolName: "rag_retrieval_tool",
            ok: true,
            latencyMs: 12,
            payload: {
              ok: true,
              data: {
                retrievalMode: "local_seed_fallback",
                disclosure: "Approximate local seed match, not live external retrieval.",
                chunks: [],
              },
            },
          },
        ],
      }),
    );

    expect(markup).toContain("Retrieval Context");
    expect(markup).toContain("Mode: local_seed_fallback");
    expect(markup).toContain("Chunks returned: 0");
    expect(markup).toContain("Approximate local seed match, not live external retrieval.");
  });

  it("renders typed presenter output for budget and opportunity tool results", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ToolResultCards, {
        mode: "all",
        toolResults: [
          {
            toolName: "budget_plan_tool",
            ok: true,
            latencyMs: 18,
            payload: {
              ok: true,
              data: {
                verdict: "safe",
                monthlyNetPosition: 320.25,
                burdenPct: 28.1,
                categoryBreakdown: { housing: 1400 },
                guidance: ["Keep savings buffer"],
                missingFields: [],
                locationResolution: { resolvedLabel: "Austin, TX" },
              },
            },
          },
          {
            toolName: "opportunity_feed_tool",
            ok: true,
            latencyMs: 9,
            payload: {
              ok: true,
              data: {
                jobs: { count: 3 },
                housing: { count: 2 },
                resources: [{ label: "Transit pass", note: "Apply online" }],
              },
            },
          },
        ],
      }),
    );

    expect(markup).toContain("Budget Fit");
    expect(markup).toContain("Monthly net position: $320.25");
    expect(markup).toContain("Market used: Austin, TX");
    expect(markup).toContain("Opportunity Feed");
    expect(markup).toContain("Jobs: 3 | Housing: 2");
    expect(markup).toContain("Transit pass");
  });

  it("renders typed presenter output for job and housing digest tool results", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ToolResultCards, {
        mode: "all",
        toolResults: [
          {
            toolName: "job_digest_tool",
            ok: true,
            latencyMs: 15,
            payload: {
              ok: true,
              data: {
                summary: "Found 1 opening.",
                keyStats: [{ label: "Openings", value: "1" }],
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
          },
          {
            toolName: "housing_digest_tool",
            ok: true,
            latencyMs: 16,
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
          },
        ],
      }),
    );

    expect(markup).toContain("Job Summary");
    expect(markup).toContain("Data Analyst");
    expect(markup).toContain("City of Austin · Austin, TX");
    expect(markup).toContain("Rental Summary");
    expect(markup).toContain("123 Main St");
    expect(markup).toContain("$1400/month");
    expect(markup).toContain("Benchmark fallback in use");
  });

  it("renders typed presenter output for ui, job search, and housing search tool results", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ToolResultCards, {
        mode: "all",
        toolResults: [
          {
            toolName: "ui_digest_tool",
            ok: true,
            latencyMs: 10,
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
          },
          {
            toolName: "job_search_tool",
            ok: true,
            latencyMs: 8,
            payload: {
              ok: true,
              data: {
                listings: [{ title: "Analyst", company: "County", location: "Austin, TX" }],
              },
            },
          },
          {
            toolName: "housing_search_tool",
            ok: true,
            latencyMs: 9,
            payload: {
              ok: true,
              data: {
                listings: [],
                fallback: { location: "Austin MSA", fmrMonthly: 1700 },
                locationResolution: { fallbackReason: "State benchmark fallback" },
              },
            },
          },
        ],
      }),
    );

    expect(markup).toContain("Affordability Snapshot");
    expect(markup).toContain("Side-by-side affordability scan.");
    expect(markup).toContain("Apply this week");
    expect(markup).toContain("Job Results (1)");
    expect(markup).toContain("Analyst");
    expect(markup).toContain("Housing Results (0)");
    expect(markup).toContain("No listings available from RentCast. Housing benchmark (Austin MSA): $1700.");
    expect(markup).toContain("State benchmark fallback");
  });

  it("renders typed presenter output for dataset query tool results", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ToolResultCards, {
        mode: "all",
        toolResults: [
          {
            toolName: "dataset_query_tool",
            ok: true,
            latencyMs: 7,
            payload: {
              ok: true,
              data: {
                location: "Austin, TX",
                metric: "currentMonthlyRent",
                disclosure: "Seed-backed benchmark.",
              },
            },
          },
        ],
      }),
    );

    expect(markup).toContain("Dataset Insight");
    expect(markup).toContain("Benchmark: Austin, TX");
    expect(markup).toContain("Metric: currentMonthlyRent");
    expect(markup).toContain("Seed-backed benchmark.");
  });
});