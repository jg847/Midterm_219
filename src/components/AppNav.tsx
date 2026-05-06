import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/story", label: "Story" },
  { href: "/resources", label: "Resources" },
];

export function AppNav() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="text-sm font-semibold tracking-wide text-slate-700">Grounded Moves</p>
        <ul className="flex items-center gap-2" aria-label="Primary navigation">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
