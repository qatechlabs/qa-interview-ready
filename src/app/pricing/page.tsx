import Link from "next/link";
import { LEVELS } from "@/content/meta";
import { allQuestions } from "@/content";
import { getAccess } from "@/lib/access";
import { razorpayConfigured, upgradeAmount } from "@/lib/razorpay";
import { FREE_PER_LEVEL, TIERS, formatPrice, tier, tierAtLeast } from "@/lib/config";
import { BuyButton } from "@/components/BuyButton";
import { RestoreForm } from "@/components/RestoreForm";
import { ALL_SCENARIOS, SCENARIOS, WORKSPACES } from "@/lab/scenarios";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

export default async function PricingPage({ searchParams }: { searchParams: { welcome?: string } }) {
  const access = await getAccess();
  const total = allQuestions().length;
  const configured = razorpayConfigured();
  const freeLabs = ALL_SCENARIOS.filter((s) => s.free).length;
  const [prep, pro, architect] = TIERS;

  if (access) {
    const mine = tier(access.tier);
    const upgrades = TIERS.filter((t) => !tierAtLeast(access.tier, t.id));
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="text-3xl font-bold">{searchParams.welcome ? `You're in. Welcome to ${mine.name}!` : `You have ${mine.name} access`}</h1>
          <p className="muted">
            {mine.id === "prep" && `All ${total} questions across every level are unlocked on this browser`}
            {mine.id === "pro" && `All ${total} questions and all ${SCENARIOS.length} live coding labs are unlocked on this browser`}
            {mine.id === "architect" && `Everything is unlocked on this browser: all ${total} questions, ${SCENARIOS.length} labs and ${WORKSPACES.length} framework workspaces`}
            {access.email ? ` for ${access.email}.` : "."}
          </p>
          <p className="text-sm muted">
            To use another device, open Pricing there and choose Restore access with your email and payment ID <code className="inline-code">{access.paymentId}</code>. Save that ID somewhere safe.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Link href={mine.id === "prep" ? "/#levels" : "/labs"} className="btn btn-primary">{mine.id === "prep" ? "Start preparing" : "Open the labs"}</Link>
            <SignOutButton />
          </div>
        </div>
        {upgrades.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-bold">Upgrade: pay only the difference</h2>
            <div className={`grid gap-4 ${upgrades.length > 1 ? "md:grid-cols-2" : "md:max-w-md"}`}>
              {upgrades.map((t) => (
                <div key={t.id} className="card p-6">
                  <h3 className="text-lg font-bold">{t.name}</h3>
                  <p className="text-sm muted">{t.tagline}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{formatPrice(upgradeAmount(t, mine))}</span>
                    <span className="text-sm muted">one-time · {formatPrice(t.amount)} total</span>
                  </div>
                  <ul className="my-4 space-y-1.5 text-sm">
                    {TIERS.filter((x) => tierAtLeast(t.id, x.id) && !tierAtLeast(mine.id, x.id)).flatMap((x) => x.adds).map((p) => (
                      <li key={p} className="flex gap-2"><span style={{ color: "var(--good)" }}>✓</span>{p}</li>
                    ))}
                  </ul>
                  <BuyButton label={`Upgrade to ${t.name} for ${formatPrice(upgradeAmount(t, mine))}`} configured={configured} tier={t.id} primary={t.id === "architect"} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const perLevel = LEVELS.map((l) => allQuestions().filter((q) => q.level === l.id).length);
  const rows: [string, string, string, string, string][] = [
    ["Questions", `First ${FREE_PER_LEVEL} of each level (${FREE_PER_LEVEL * LEVELS.length})`, `All ${total} (${Math.min(...perLevel)}–${Math.max(...perLevel)} per level)`, `All ${total}`, `All ${total}`],
    ["60-second answer + explanation + example + code", "Free questions only", "Every question", "Every question", "Every question"],
    ["Study path, flashcards, progress", "✓", "✓", "✓", "✓"],
    ["Mock interview rounds", "From free questions", "Full bank, weak-spot and per-topic rounds", "✓", "✓"],
    ["Live coding labs (practice apps + real sites)", `${freeLabs} free labs`, "Free labs", `All ${SCENARIOS.length} labs`, `All ${SCENARIOS.length} labs`],
    ["Runs on GitHub Actions in your own repo", "Free labs", "Free labs", "✓", "✓"],
    ["Run report + Word evidence document", "✓", "✓", "✓", "✓"],
    ["Playwright + Selenium Java reference solutions", "Free labs", "Free labs", "All labs", "All labs"],
    ["Framework workspaces: build from scratch", `${WORKSPACES.filter((w) => w.free).length} free`, "Free workspaces", "Free workspaces", `All ${WORKSPACES.length}, with reference frameworks`],
    ["New content as it's added", "—", "Questions", "Questions + labs", "Everything"],
    ["Devices", "Any", "Any: restore with email + payment ID", "Any", "Any"],
  ];
  const faq: [string, string][] = [
    ["Is this a subscription?", `No. Each tier is a one-time payment and stays unlocked. There are no renewals and nothing to cancel.`],
    ["Can I start small and upgrade?", `Yes. Buy Prep now and upgrade to Pro or Architect any time by paying only the difference (for example ${formatPrice(upgradeAmount(architect, prep))} from Prep to Architect).`],
    ["Which tier should I pick?", "Prep if you need answers for the interview. Pro if the interview has a coding round. Architect if you'll be asked to design a framework or want to prove you can build one from scratch."],
    ["Can I use it on my phone and laptop?", "Yes. Pay once, then on the other device open Pricing and use Restore access with the email you paid with and the payment ID from your Razorpay receipt."],
    ["What if it isn't for me?", "Email us within 7 days of purchase and we'll refund you. See the refund policy for details."],
  ];
  const cards = [
    { t: prep, cta: `Get Prep for ${formatPrice(prep.amount)}`, note: `${total} questions, every level` },
    { t: pro, cta: `Get Pro for ${formatPrice(pro.amount)}`, note: `Prep + ${SCENARIOS.length} live labs` },
    { t: architect, cta: `Get Architect for ${formatPrice(architect.amount)}`, note: `Pro + ${WORKSPACES.length} framework workspaces`, best: true },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">One-time payment. Pick how far you want to go.</h1>
        <p className="mt-2 muted">Each tier includes everything in the tiers before it. Upgrade later for the difference.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ t, cta, note, best }) => (
          <div key={t.id} className="card card-tilt relative flex flex-col p-6" data-tilt="2.5" style={best ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" } : undefined}>
            {best && <span className="absolute -top-3 left-5 rounded-full px-3 py-0.5 text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>Best value</span>}
            <h2 className="text-xl font-bold">{t.name}</h2>
            <p className="text-sm muted">{t.tagline}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-bold">{formatPrice(t.amount)}</span>
              <span className="text-sm muted">one-time</span>
            </div>
            <p className="mt-1 text-sm font-medium">{note}</p>
            <ul className="my-5 flex-1 space-y-1.5 text-sm">
              {t.id !== "prep" && <li className="flex gap-2 font-medium"><span style={{ color: "var(--good)" }}>✓</span>Everything in {t.id === "pro" ? "Prep" : "Pro"}</li>}
              {t.adds.map((p) => (
                <li key={p} className="flex gap-2"><span style={{ color: "var(--good)" }}>✓</span>{p}</li>
              ))}
            </ul>
            <BuyButton label={cta} configured={configured} tier={t.id} primary={!!best} />
          </div>
        ))}
      </div>
      <p className="text-center text-xs muted">
        Secure payment by Razorpay: UPI, cards, netbanking and wallets. Instant access, no account needed. See our <Link href="/refunds" className="underline">refund policy</Link>.
      </p>

      <section>
        <h2 className="mb-3 text-xl font-bold">What each tier includes</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="px-4 py-3 text-left font-semibold"></th>
                <th className="px-4 py-3 text-left font-semibold">Free</th>
                <th className="px-4 py-3 text-left font-semibold">Prep {formatPrice(prep.amount)}</th>
                <th className="px-4 py-3 text-left font-semibold">Pro {formatPrice(pro.amount)}</th>
                <th className="px-4 py-3 text-left font-semibold accent">Architect {formatPrice(architect.amount)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, f, a, b, c]) => (
                <tr key={k} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-medium">{k}</td>
                  <td className="px-4 py-3 muted">{f}</td>
                  <td className="px-4 py-3">{a}</td>
                  <td className="px-4 py-3">{b}</td>
                  <td className="px-4 py-3">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold">Already paid?</h2>
          <p className="mb-4 mt-1 text-sm muted">Restore access on this device with the email you paid with and the payment ID from your Razorpay receipt email. Your tier comes with it.</p>
          <RestoreForm />
        </section>
        <section className="space-y-3">
          {faq.slice(0, 2).map(([q, a]) => (
            <div key={q} className="card p-5">
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-1 text-sm muted">{a}</p>
            </div>
          ))}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold">Questions people ask</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {faq.slice(2).map(([q, a]) => (
            <div key={q} className="card p-5">
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-1 text-sm muted">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
