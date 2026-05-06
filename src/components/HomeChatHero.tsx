"use client";

import { useLocationContextState } from "@/interface-adapters/location/useLocationContext";
import { ChatAssistantPanel } from "./ChatAssistantPanel";
import { LocationContextPanel } from "./LocationContextPanel";

export function HomeChatHero() {
  const { location, onLocationResolved } = useLocationContextState();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8">
      <header className="rounded-[2rem] border border-[#d9d2c3] bg-[radial-gradient(circle_at_top_left,#fffdf8_0%,#f8f4ea_55%,#ece6d8_100%)] p-4 shadow-sm sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Grounded Moves</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:mt-3 sm:text-3xl">Location-aware housing, jobs, and affordability guidance</h1>
        <p className="mt-3 hidden max-w-3xl text-sm leading-6 text-slate-600 sm:block">
          Ask practical questions about rents, pay, and tradeoffs in any U.S. market without leaving the homepage.
        </p>
        <p className="mt-2 hidden text-xs text-slate-500 sm:block">
          Start with one location and one focused question for faster, more grounded results.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="order-2 md:order-1">
          <ChatAssistantPanel location={location} compact />
        </div>
        <aside className="order-1 md:order-2 md:sticky md:top-6">
          <LocationContextPanel
            onResolved={onLocationResolved}
            title="Location anchor"
            description="Set one city or ZIP code and keep the assistant grounded to that market while you compare jobs, rent, and affordability tradeoffs."
          />
        </aside>
      </div>
    </main>
  );
}