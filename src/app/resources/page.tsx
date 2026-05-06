import { ResourcesExperience } from "@/components/ResourcesExperience";

export default function ResourcesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Resources</h1>
        <p className="mt-2 text-sm text-slate-600">
          Build a practical plan using national directories, state housing pathways, and workforce support programs.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Use these directories as a starting point, then confirm local eligibility, waitlists, and office coverage for your market.
        </p>
      </header>

      <ResourcesExperience />
    </main>
  );
}
