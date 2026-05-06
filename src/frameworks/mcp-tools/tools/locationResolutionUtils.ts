import type { LocationResolution } from "@/domain/models/LocationContext";

type HousingMarketRow = {
  location: string;
  bedroomCount: number;
  fmrMonthly: number;
};

function buildNationalBenchmarkRow(rows: HousingMarketRow[], bedroomCount: number): HousingMarketRow | null {
  const matchingRows = rows
    .filter((row) => row.bedroomCount === bedroomCount)
    .map((row) => row.fmrMonthly)
    .sort((left, right) => left - right);

  if (matchingRows.length === 0) {
    return null;
  }

  const midpoint = Math.floor(matchingRows.length / 2);
  const median = matchingRows.length % 2 === 0
    ? Math.round((matchingRows[midpoint - 1] + matchingRows[midpoint]) / 2)
    : matchingRows[midpoint];

  return {
    location: "National benchmark",
    bedroomCount,
    fmrMonthly: median,
  };
}

const STATE_DEFAULT_METROS: Record<string, string> = {
  AZ: "Phoenix, AZ",
  CA: "Los Angeles, CA",
  CO: "Denver, CO",
  FL: "Miami, FL",
  GA: "Atlanta, GA",
  IL: "Chicago, IL",
  MA: "Boston, MA",
  NC: "Charlotte, NC",
  NJ: "Newark, NJ",
  NY: "New York, NY",
  PA: "Philadelphia, PA",
  TX: "Houston, TX",
  WA: "Seattle, WA",
};

export function buildExactLocationResolution(label: string): LocationResolution {
  return {
    resolvedLabel: label,
    resolutionKind: "exact",
    usedFallback: false,
  };
}

export function resolveHousingBaselineRow(
  rows: HousingMarketRow[],
  requestedLocation: string,
  state: string,
  bedroomCount: number,
): { row: HousingMarketRow; locationResolution: LocationResolution } | null {
  const exact = rows.find(
    (row) => row.location.toLowerCase() === requestedLocation.toLowerCase() && row.bedroomCount === bedroomCount,
  );
  if (exact) {
    return {
      row: exact,
      locationResolution: buildExactLocationResolution(exact.location),
    };
  }

  const stateDefaultMetro = STATE_DEFAULT_METROS[state];
  if (stateDefaultMetro) {
    const metroRow = rows.find(
      (row) => row.location.toLowerCase() === stateDefaultMetro.toLowerCase() && row.bedroomCount === bedroomCount,
    );
    if (metroRow) {
      return {
        row: metroRow,
        locationResolution: {
          resolvedLabel: metroRow.location,
          resolutionKind: "state_default_metro",
          usedFallback: true,
          fallbackReason: `No exact baseline was available for ${requestedLocation}, so the default metro ${metroRow.location} was used for ${state}.`,
        },
      };
    }
  }

  const sameStateRow = rows.find(
    (row) => row.location.toLowerCase().endsWith(`, ${state.toLowerCase()}`) && row.bedroomCount === bedroomCount,
  );
  if (sameStateRow) {
    return {
      row: sameStateRow,
      locationResolution: {
        resolvedLabel: sameStateRow.location,
        resolutionKind: "fallback_metro",
        usedFallback: true,
        fallbackReason: `No exact baseline was available for ${requestedLocation}, so ${sameStateRow.location} was used as the nearest seeded metro in ${state}.`,
      },
    };
  }

  const nationalBenchmark = buildNationalBenchmarkRow(rows, bedroomCount);
  if (nationalBenchmark) {
    return {
      row: nationalBenchmark,
      locationResolution: {
        resolvedLabel: nationalBenchmark.location,
        resolutionKind: "national_benchmark",
        usedFallback: true,
        fallbackReason: `No exact or same-state baseline was available for ${requestedLocation}, so a national benchmark derived from seeded metros was used.`,
      },
    };
  }

  return null;
}