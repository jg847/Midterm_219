import { z } from "zod";

export const LocationLookupInputSchema = z.object({
  query: z.string().min(2),
});

export const JobSearchInputSchema = z.object({
  query: z.string().min(2),
  location: z.string().min(2),
  jobCategoryCode: z.string().regex(/^\d{4}$/).optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

export const HousingSearchInputSchema = z.object({
  city: z.string().min(2),
  state: z.string().length(2),
  minRent: z.number().int().min(0).optional(),
  maxRent: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

export const HousingMarketInputSchema = z.object({
  location: z.string().min(2),
  bedroomCount: z.number().int().min(0).max(4).default(1),
});

export const DatasetQueryInputSchema = z.object({
  metric: z.enum(["currentMonthlyRent", "livingWage", "minimumWage", "rentTrend"]),
});

export const StoryInformationInputSchema = z.object({
  question: z.string().min(2),
});

export const RagRetrievalInputSchema = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(10).default(5),
});

export const OpportunityFeedInputSchema = z.object({
  query: z.string().min(2).default("entry level"),
  location: z.string().min(2),
  city: z.string().min(2),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(?:-\d{4})?$/).optional(),
  radiusMiles: z.number().int().min(1).max(100).default(15),
  limit: z.number().int().min(1).max(10).default(5),
});

export const UiDigestInputSchema = OpportunityFeedInputSchema;

export const ListingActionLinksInputSchema = z.object({
  formattedAddress: z.string().min(5),
  city: z.string().min(2),
  state: z.string().length(2),
  source: z.string().min(2).default("rental_listing"),
});

export const HousingDigestInputSchema = z.object({
  query: z.string().min(2),
  location: z.string().min(2),
  city: z.string().min(2),
  state: z.string().length(2),
  radiusMiles: z.number().int().min(1).max(100).default(15),
  limit: z.number().int().min(1).max(10).default(5),
});

export const JobDigestInputSchema = z.object({
  query: z.string().min(2),
  location: z.string().min(2),
  limit: z.number().int().min(1).max(10).default(5),
  jobCategoryCode: z.string().regex(/^\d{4}$/).optional(),
});

export type LocationLookupInput = z.infer<typeof LocationLookupInputSchema>;
export type JobSearchInput = z.infer<typeof JobSearchInputSchema>;
export type HousingSearchInput = z.infer<typeof HousingSearchInputSchema>;
export type HousingMarketInput = z.infer<typeof HousingMarketInputSchema>;
export type DatasetQueryInput = z.infer<typeof DatasetQueryInputSchema>;
export type StoryInformationInput = z.infer<typeof StoryInformationInputSchema>;
export type RagRetrievalInput = z.infer<typeof RagRetrievalInputSchema>;
export type OpportunityFeedInput = z.infer<typeof OpportunityFeedInputSchema>;
export type UiDigestInput = z.infer<typeof UiDigestInputSchema>;
export type ListingActionLinksInput = z.infer<typeof ListingActionLinksInputSchema>;
export type HousingDigestInput = z.infer<typeof HousingDigestInputSchema>;
export type JobDigestInput = z.infer<typeof JobDigestInputSchema>;
