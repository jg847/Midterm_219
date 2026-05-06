"use client";

import { useMemo, useState } from "react";

export function RentBurdenSimulator({ initialRent }: { initialRent: number }) {
  const [hourlyWage, setHourlyWage] = useState(25);
  const [roommate, setRoommate] = useState(false);

  const burden = useMemo(() => {
    const effectiveRent = roommate ? initialRent / 2 : initialRent;
    const monthlyIncome = (hourlyWage * 40 * 52) / 12;
    return (effectiveRent / monthlyIncome) * 100;
  }, [hourlyWage, roommate, initialRent]);

  const burdenClass = burden >= 50 ? "text-red-700" : burden >= 30 ? "text-amber-700" : "text-emerald-700";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Rent burden simulator">
      <h2 className="text-xl font-semibold text-slate-900">Rent Burden Simulator</h2>
      <p className="mt-2 text-sm text-slate-600">Adjust wage and roommate scenario to estimate burden in real time.</p>

      <label htmlFor="wage-slider" className="mt-4 block text-sm font-medium text-slate-700">
        Hourly wage: ${hourlyWage}
      </label>
      <input
        id="wage-slider"
        type="range"
        min={15}
        max={60}
        value={hourlyWage}
        onChange={(event) => setHourlyWage(Number(event.target.value))}
        className="mt-2 w-full"
      />

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={roommate} onChange={(event) => setRoommate(event.target.checked)} />
        Split rent with one roommate
      </label>

      <p className={`mt-4 text-2xl font-semibold ${burdenClass}`}>{burden.toFixed(2)}%</p>
      <p className="text-xs text-slate-500">30%+ is rent burdened. 50%+ is severely rent burdened.</p>
    </section>
  );
}
