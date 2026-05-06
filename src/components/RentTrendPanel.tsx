type TrendPoint = {
  date: string;
  rent: number;
};

type RentTrendPanelProps = {
  points: TrendPoint[];
};

function formatMonth(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function RentTrendPanel({ points }: RentTrendPanelProps) {
  const recent = points.slice(-12);
  const first = recent[0];
  const last = recent[recent.length - 1];

  if (!first || !last) {
    return <p className="text-sm text-slate-500">No rent trend data available.</p>;
  }

  const min = Math.min(...recent.map((point) => point.rent));
  const max = Math.max(...recent.map((point) => point.rent));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Rent trend panel">
      <h2 className="text-xl font-semibold text-slate-900">Recent Rent Trend</h2>
      <p className="mt-2 text-sm text-slate-600">
        Latest 12 months from {formatMonth(first.date)} to {formatMonth(last.date)}.
      </p>
      <div className="mt-4 grid gap-2">
        {recent.map((point) => {
          const pct = max === min ? 100 : ((point.rent - min) / (max - min)) * 100;
          return (
            <div key={point.date} className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3">
              <span className="text-xs text-slate-500">{formatMonth(point.date)}</span>
              <div className="h-2 rounded bg-slate-100">
                <div className="h-2 rounded bg-sky-600" style={{ width: `${Math.max(6, pct)}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-700">${point.rent.toFixed(0)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
