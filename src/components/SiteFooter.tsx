import Link from "next/link";
import { SITE } from "@/lib/config";

export function SiteFooter() {
  const links = [
    ["/pricing", "Pricing"],
    ["/contact", "Contact"],
    ["/terms", "Terms"],
    ["/privacy", "Privacy"],
    ["/refunds", "Refunds & cancellation"],
    ["/shipping", "Delivery policy"],
  ];
  return (
    <footer className="border-t" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="muted">© {new Date().getFullYear()} {SITE.businessName}. {SITE.name}.</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="muted hover:underline">{label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
