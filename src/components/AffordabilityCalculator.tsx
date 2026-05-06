"use client";

import { useMemo, useState } from "react";

export function AffordabilityCalculator() {
  const [incomeInput, setIncomeInput] = useState("");
  const [rentInput, setRentInput] = useState("");
  const [utilitiesInput, setUtilitiesInput] = useState("150");

  const values = useMemo(() => {
    const income = Number(incomeInput) || 0;
    const rent = Number(rentInput) || 0;
    const utilities = Number(utilitiesInput) || 0;
    const housingCost = rent + utilities;
    const burden = income > 0 ? (housingCost / income) * 100 : 0;

    return { income, rent, utilities, housingCost, burden };
  }, [incomeInput, rentInput, utilitiesInput]);

  const showResults = values.income > 0 && values.rent > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Affordability calculator">
      <h2 className="text-xl font-semibold text-slate-900">Personal Affordability Calculator</h2>
      <p className="mt-2 text-sm text-slate-600">Enter your own numbers to estimate housing pressure.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-700">
          Monthly income
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            inputMode="decimal"
            value={incomeInput}
            onChange={(event) => setIncomeInput(event.target.value)}
            placeholder="3200"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          Monthly rent
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            inputMode="decimal"
            value={rentInput}
            onChange={(event) => setRentInput(event.target.value)}
            placeholder="1800"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          Utilities
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            inputMode="decimal"
            value={utilitiesInput}
            onChange={(event) => setUtilitiesInput(event.target.value)}
            placeholder="150"
          />
        </label>
      </div>

      {!showResults ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Enter monthly income and rent to see your results.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 text-sm text-slate-700" aria-live="polite">
          <p>Total housing cost: ${values.housingCost.toFixed(2)}</p>
          <p>Burden ratio: {values.burden.toFixed(2)}%</p>
          <p>
            Status: {values.burden >= 50 ? "Severely burdened" : values.burden >= 30 ? "Rent burdened" : "Below burden threshold"}
          </p>
        </div>
      )}
    </section>
  );
}
