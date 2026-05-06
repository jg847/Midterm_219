"use client";

import { useMemo, useState } from "react";

import { AffordabilityCalculator } from "@/components/AffordabilityCalculator";
import { LocationContextPanel } from "@/components/LocationContextPanel";
import { RentBurdenSimulator } from "@/components/RentBurdenSimulator";
import { RentTrendPanel } from "@/components/RentTrendPanel";
import { useLocationContextState } from "@/interface-adapters/location/useLocationContext";
import { getStoryReferenceSeed } from "@/shared/data/storyReferenceSeed";

export default function StoryPage() {
  const seed = getStoryReferenceSeed();
  const [comparisonMode, setComparisonMode] = useState(false);
  const current = useLocationContextState();
  const target = useLocationContextState();

  const trendPoints = useMemo(() => {
    if (!current.baseline?.fmrMonthly || seed.rent.currentMonthlyRent <= 0) {
      return seed.rent.rentTrend;
    }

    const multiplier = current.baseline.fmrMonthly / seed.rent.currentMonthlyRent;
    return seed.rent.rentTrend.map((point) => ({
      date: point.date,
      rent: Number((point.rent * multiplier).toFixed(0)),
    }));
  }, [current.baseline?.fmrMonthly, seed.rent.currentMonthlyRent, seed.rent.rentTrend]);

  const effectiveRent = current.baseline?.fmrMonthly ?? seed.rent.currentMonthlyRent;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Market Story Explorer</h1>
        <p className="mt-2 text-sm text-slate-600">
          Interactive affordability walkthrough calibrated to your selected location context.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {seed.disclosure}
        </p>
        <p className="mt-2 text-xs text-slate-500">Benchmark source: {seed.referenceLabel}</p>
        {current.location ? (
          <p className="mt-2 text-xs text-slate-500">
            Active location: {current.location.formatted} ({current.location.radiusMiles} mi radius)
          </p>
        ) : null}
        {current.baseline?.locationResolution?.usedFallback ? (
          <p className="mt-2 text-xs text-amber-700">
            Housing benchmark note: {current.baseline.locationResolution.fallbackReason}
          </p>
        ) : null}
      </header>

      <LocationContextPanel
        onResolved={current.onLocationResolved}
        title="Current Location"
        description="Set your current location to ground the comparison baseline."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={comparisonMode}
            onChange={(event) => setComparisonMode(event.target.checked)}
          />
          Compare against a target move location
        </label>
      </section>

      {comparisonMode ? (
        <LocationContextPanel
          onResolved={target.onLocationResolved}
          title="Target Location"
          description="Set a second location to compare affordability before moving or negotiating a new job."
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <RentTrendPanel points={trendPoints} />
        <RentBurdenSimulator initialRent={effectiveRent} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Wage Context</h2>
        <p className="mt-2 text-sm text-slate-600">
          Living wage benchmark: ${seed.wages.livingWage.toFixed(2)}/hr. Minimum wage reference: ${
            current.policy?.minimumWageHourly?.toFixed(2) ?? seed.wages.minimumWage.toFixed(2)
          }/hr.
        </p>
        <p className="mt-2 text-xs text-slate-500">Historical source seed: {seed.sourceLabel}</p>
        {current.policy ? <p className="mt-2 text-xs text-slate-500">{current.policy.notes}</p> : null}
        {comparisonMode && current.location && target.location ? (
          <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-2">
            <div>
              <p className="font-semibold text-slate-900">Current: {current.location.formatted}</p>
              <p>1BR baseline: ${String(current.baseline?.fmrMonthly ?? "N/A")}</p>
              <p>Min wage: ${String(current.policy?.minimumWageHourly ?? "N/A")}/hr</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Target: {target.location.formatted}</p>
              <p>1BR baseline: ${String(target.baseline?.fmrMonthly ?? "N/A")}</p>
              <p>Min wage: ${String(target.policy?.minimumWageHourly ?? "N/A")}/hr</p>
            </div>
          </div>
        ) : null}
      </section>

      <AffordabilityCalculator />
    </main>
  );
}
