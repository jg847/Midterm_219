import rawSeed from "../../../data/seeds/newark-affordability.seed.json";

export type StoryReferenceSeed = {
  referenceLabel: string;
  sourceLabel: string;
  disclosure: string;
  wages: {
    livingWage: number;
    minimumWage: number;
  };
  rent: {
    currentMonthlyRent: number;
    rentTrend: Array<{ date: string; rent: number }>;
  };
};

type RawStorySeed = {
  location: string;
  wages: {
    livingWage: number;
    minimumWage: number;
  };
  rent: {
    currentMonthlyRent: number;
    rentTrend: Array<{ date: string; rent: number }>;
  };
};

const raw = rawSeed as RawStorySeed;

export function getStoryReferenceSeed(): StoryReferenceSeed {
  return {
    referenceLabel: "Reference affordability benchmark",
    sourceLabel: raw.location,
    disclosure:
      "Historical trend shape comes from an internal Newark-area reference seed and is rescaled before it is shown for another market.",
    wages: raw.wages,
    rent: raw.rent,
  };
}