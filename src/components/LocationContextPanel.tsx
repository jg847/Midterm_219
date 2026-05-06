"use client";

import { useEffect, useState } from "react";

import {
  resolveLocationContext,
  type LocationResolveResponse,
} from "@/interface-adapters/location/locationApiClient";
import {
  readLocationPreference,
  writeLocationPreference,
} from "@/interface-adapters/location/storage";

export function LocationContextPanel({
  onResolved,
  title = "Location Context",
  description = "Set your target city once and the assistant will use the same location baseline.",
}: {
  onResolved: (value: LocationResolveResponse) => void;
  title?: string;
  description?: string;
}) {
  const [query, setQuery] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(15);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      const savedPreference = readLocationPreference();
      if (!savedPreference || cancelled) return;

      setRadiusMiles(savedPreference.radiusMiles);
      setActiveLocation(savedPreference.formatted);

      void resolveLocationContext({ query: savedPreference.formatted, radiusMiles: savedPreference.radiusMiles }).then(
        (result) => {
          if (!result.ok || cancelled) return;
          onResolved(result);
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [onResolved]);

  async function submitManualLocation() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setStatus(null);

    const result = await resolveLocationContext({ query: trimmed, radiusMiles });
    setLoading(false);

    if (!result.ok || !result.location) {
      setStatus(result.error ?? "Unable to resolve that location.");
      return;
    }

    writeLocationPreference(result.location);
    setActiveLocation(result.location.formatted);
    setStatus(`Using ${result.location.formatted}`);
    onResolved(result);
  }

  function requestBrowserLocation() {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not available in this browser.");
      return;
    }

    setLoading(true);
    setStatus("Resolving your current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const result = await resolveLocationContext({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          radiusMiles,
        });

        setLoading(false);

        if (!result.ok || !result.location) {
          setStatus(result.error ?? "Could not resolve geolocation.");
          return;
        }

        writeLocationPreference(result.location);
        setActiveLocation(result.location.formatted);
        setStatus(`Using ${result.location.formatted}`);
        onResolved(result);
      },
      () => {
        setLoading(false);
        setStatus("Location permission denied. You can enter a city manually.");
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  return (
    <section
      className="rounded-3xl border border-[#d9d2c3] bg-[linear-gradient(180deg,#fffdf7_0%,#f6f1e7_100%)] p-3 shadow-sm sm:p-4"
      aria-label="Location context"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Context</p>
      <h2 className="mt-1 text-base font-semibold text-slate-900 sm:mt-2 sm:text-lg">{title}</h2>
      <p className="mt-1 hidden text-sm leading-6 text-slate-600 sm:mt-2 sm:block">{description}</p>

      {activeLocation ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:mt-4">
          Active location: {activeLocation}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 sm:mt-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 w-full rounded-xl border border-[#d5cfbf] bg-white px-3 py-2.5 text-sm"
          placeholder="City, state or ZIP code (e.g. Austin, TX)"
          aria-label="Manual location query"
        />

        <div className="flex min-w-0 gap-2 sm:hidden">
          <button
            onClick={() => void submitManualLocation()}
            disabled={loading}
            className="min-w-0 flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
          >
            Apply
          </button>
          <button
            onClick={requestBrowserLocation}
            disabled={loading}
            className="min-w-0 flex-1 rounded-xl border border-[#d5cfbf] bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
          >
            Use Current Location
          </button>
        </div>

        <div className="hidden gap-3 sm:grid sm:grid-cols-[1fr_auto]">
          <label className="grid min-w-0 gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Radius miles
            </span>
            <input
              value={radiusMiles}
              onChange={(event) => setRadiusMiles(Math.max(1, Number(event.target.value) || 15))}
              className="min-w-0 w-full rounded-xl border border-[#d5cfbf] bg-white px-3 py-2.5 text-sm"
              inputMode="numeric"
              aria-label="Search radius miles"
            />
          </label>
          <button
            onClick={() => void submitManualLocation()}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60 sm:self-end"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="mt-3 hidden sm:block">
        <button
          onClick={requestBrowserLocation}
          disabled={loading}
          className="rounded-xl border border-[#d5cfbf] bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
        >
          Use Current Location (optional)
        </button>
      </div>

      {status ? <p className="mt-3 text-xs leading-5 text-slate-600">{status}</p> : null}
    </section>
  );
}
