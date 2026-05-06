import { describe, expect, it } from "vitest";

import {
  DatasetQueryInputSchema,
  HousingMarketInputSchema,
  HousingDigestInputSchema,
  HousingSearchInputSchema,
  JobDigestInputSchema,
  JobSearchInputSchema,
  ListingActionLinksInputSchema,
  LocationLookupInputSchema,
  OpportunityFeedInputSchema,
  RagRetrievalInputSchema,
  StoryInformationInputSchema,
  UiDigestInputSchema,
} from "@/shared/schemas/toolContracts";
import { BudgetPlanToolInputSchema as BudgetPlanToolSchema } from "@/shared/schemas/budget";

describe("tool contracts", () => {
  it("validates location lookup contract", () => {
    expect(LocationLookupInputSchema.safeParse({ query: "Austin, TX" }).success).toBe(true);
    expect(LocationLookupInputSchema.safeParse({ query: "A" }).success).toBe(false);
  });

  it("validates jobs contract", () => {
    expect(JobSearchInputSchema.safeParse({ query: "analyst", location: "Austin, TX" }).success).toBe(true);
    expect(JobSearchInputSchema.safeParse({ query: "", location: "Austin, TX" }).success).toBe(false);
  });

  it("validates job digest contract", () => {
    expect(
      JobDigestInputSchema.safeParse({ query: "software engineer", location: "Austin, TX", limit: 5 }).success,
    ).toBe(true);
    expect(
      JobDigestInputSchema.safeParse({ query: "software engineer", location: "Austin, TX", jobCategoryCode: "2210", limit: 5 }).success,
    ).toBe(true);
    expect(
      JobDigestInputSchema.safeParse({ query: "software engineer", location: "Austin, TX", jobCategoryCode: "22", limit: 5 }).success,
    ).toBe(false);
  });

  it("validates housing search contract", () => {
    expect(HousingSearchInputSchema.safeParse({ city: "Austin", state: "TX" }).success).toBe(true);
    expect(HousingSearchInputSchema.safeParse({ city: "Austin", state: "Texas" }).success).toBe(false);
  });

  it("validates housing market contract", () => {
    expect(HousingMarketInputSchema.safeParse({ location: "Austin, TX", bedroomCount: 1 }).success).toBe(true);
    expect(HousingMarketInputSchema.safeParse({ location: "Austin, TX", bedroomCount: 8 }).success).toBe(false);
  });

  it("validates dataset query contract", () => {
    expect(DatasetQueryInputSchema.safeParse({ metric: "livingWage" }).success).toBe(true);
    expect(DatasetQueryInputSchema.safeParse({ metric: "badMetric" }).success).toBe(false);
  });

  it("validates story information contract", () => {
    expect(StoryInformationInputSchema.safeParse({ question: "What changed?" }).success).toBe(true);
    expect(StoryInformationInputSchema.safeParse({ question: "x" }).success).toBe(false);
  });

  it("validates retrieval contract", () => {
    expect(RagRetrievalInputSchema.safeParse({ query: "rent burden", limit: 3 }).success).toBe(true);
    expect(RagRetrievalInputSchema.safeParse({ query: "rent burden", limit: 99 }).success).toBe(false);
  });

  it("validates opportunity feed contract", () => {
    expect(
      OpportunityFeedInputSchema.safeParse({
        query: "entry level",
        location: "Austin, TX",
        city: "Austin",
        state: "TX",
        radiusMiles: 15,
        limit: 5,
      }).success,
    ).toBe(true);

    expect(
      OpportunityFeedInputSchema.safeParse({
        query: "entry level",
        location: "Austin, TX",
        city: "Austin",
        state: "Texas",
        radiusMiles: 15,
        limit: 5,
      }).success,
    ).toBe(false);
  });

  it("validates listing action links contract", () => {
    expect(
      ListingActionLinksInputSchema.safeParse({
        formattedAddress: "40 Cornerstone Ln, Newark, NJ 07103",
        city: "Newark",
        state: "NJ",
        source: "rentcast",
      }).success,
    ).toBe(true);
    expect(
      ListingActionLinksInputSchema.safeParse({
        formattedAddress: "bad",
        city: "Newark",
        state: "New Jersey",
      }).success,
    ).toBe(false);
  });

  it("validates housing digest contract", () => {
    expect(
      HousingDigestInputSchema.safeParse({
        query: "rentals under $1800",
        location: "Newark, NJ",
        city: "Newark",
        state: "NJ",
        radiusMiles: 15,
        limit: 5,
      }).success,
    ).toBe(true);
    expect(
      HousingDigestInputSchema.safeParse({
        query: "rentals",
        location: "Newark, NJ",
        city: "Newark",
        state: "New Jersey",
        radiusMiles: 15,
        limit: 5,
      }).success,
    ).toBe(false);
  });

  it("validates ui digest contract", () => {
    expect(
      UiDigestInputSchema.safeParse({
        query: "entry level",
        location: "Austin, TX",
        city: "Austin",
        state: "TX",
        radiusMiles: 15,
        limit: 5,
      }).success,
    ).toBe(true);

    expect(
      UiDigestInputSchema.safeParse({
        query: "entry level",
        location: "Austin, TX",
        city: "Austin",
        state: "Texas",
        radiusMiles: 15,
        limit: 5,
      }).success,
    ).toBe(false);
  });

  it("validates budget plan contract", () => {
    expect(
      BudgetPlanToolSchema.safeParse({
        profile: {
          grossMonthlyIncome: 5000,
          monthlyHousingCost: 1800,
          utilities: 150,
        },
        location: {
          formatted: "Austin, TX",
          city: "Austin",
          state: "TX",
          country: "US",
          radiusMiles: 15,
        },
        compareAgainst: {
          rentMonthly: 1900,
          source: "tool_observed",
        },
      }).success,
    ).toBe(true);

    expect(
      BudgetPlanToolSchema.safeParse({
        profile: {
          grossMonthlyIncome: -1,
        },
      }).success,
    ).toBe(false);
  });
});
