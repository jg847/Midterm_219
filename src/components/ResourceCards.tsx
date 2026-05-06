import type { SupportResourceLink } from "@/domain/models/SupportResource";

export function ResourceCards({ resources }: { resources: SupportResourceLink[] }) {
  return (
    <section className="grid gap-4" aria-label="Support resources">
      {resources.map((resource) => (
        <article key={`${resource.label}-${resource.url}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{resource.label}</h3>
              <p className="mt-2 text-sm text-slate-600">{resource.note ?? "Open this directory for next-step support."}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium uppercase text-slate-500">
              {resource.category.replaceAll("_", " ")}
            </span>
          </div>

          {resource.locationLabel ? (
            <p className="mt-3 text-xs text-slate-500">Coverage anchor: {resource.locationLabel}</p>
          ) : null}

          {resource.isFallback ? (
            <p className="mt-2 text-xs text-amber-700">
              Fallback coverage: {resource.fallbackScope ?? "general"}
            </p>
          ) : null}

          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm font-medium text-sky-700 underline decoration-sky-300 underline-offset-2"
          >
            Open resource
          </a>
        </article>
      ))}
    </section>
  );
}
