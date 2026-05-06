"use client";

import { buildSupportResources } from "@/application/location/BuildSupportResources";
import { useLocationContextState } from "@/interface-adapters/location/useLocationContext";

import { LocationContextPanel } from "./LocationContextPanel";
import { ResourceCards } from "./ResourceCards";

export function ResourcesExperience() {
  const { location, onLocationResolved } = useLocationContextState();
  const resources = buildSupportResources(
    location
      ? {
          city: location.city,
          state: location.state,
          zipCode: location.postalCode,
        }
      : {},
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <aside className="lg:sticky lg:top-6">
        <LocationContextPanel
          onResolved={onLocationResolved}
          title="Resource location"
          description="Set one city or ZIP code to focus these support links on the market you are comparing."
        />
      </aside>

      <section className="grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {location ? `Support links for ${location.formatted}` : "National support starting points"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {location
              ? "These links are grounded to your selected market where possible and disclose when coverage is only state-level or national."
              : "Pick a location to narrow these directories. Until then, the page shows national starting points that you can refine later."}
          </p>
        </div>

        <ResourceCards resources={resources} />
      </section>
    </div>
  );
}