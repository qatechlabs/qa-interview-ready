import Link from "next/link";
import { SITE } from "@/lib/config";
import { hasPremium } from "@/lib/access";

export async function SiteHeader() {
  const premium = await hasPremium();
  const nav = [
    { href: "/#levels", label: "Levels" },
    { href: "/practice", label: "Flashcards" },
    { href: "/search", label: "Search" },
    { href: "/progress", label: "My progress" },
  ];
  return (
    <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg text-sm" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>QA</span>
          <span className="hidden sm:inline">{SITE.name}</span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 text-sm sm:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-2.5 py-1.5 hover:bg-[var(--surface-2)]">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto sm:ml-0">
          {premium ? (
            <span className="chip ml-1 whitespace-nowrap" style={{ color: "var(--good)" }}>✓ Pro</span>
          ) : (
            <Link href="/pricing" className="btn btn-primary ml-1 whitespace-nowrap !px-3 !py-1.5">Unlock all</Link>
          )}
        </div>
      </div>
      <nav className="flex justify-around border-t px-2 text-sm sm:hidden" style={{ borderColor: "var(--border)" }}>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap px-2 py-2 muted">{n.label}</Link>
        ))}
      </nav>
    </header>
  );
}
