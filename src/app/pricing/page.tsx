import Link from "next/link";
import { LEVELS } from "@/content/meta";
import { allQuestions } from "@/content";
import { getAccess } from "@/lib/access";
import { razorpayConfigured } from "@/lib/razorpay";
import { FREE_PER_LEVEL, PRICE, formatPrice } from "@/lib/config";
import { BuyButton } from "@/components/BuyButton";
import { RestoreForm } from "@/components/RestoreForm";
import { ALL_SCENARIOS, WORKSPACES } from "@/lab/scenarios";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

export default async function PricingPage({ searchParams }: { searchParams: { welcome?: string } }) {
  const access = await getAccess();
  const total = allQuestions().length;
  if (access) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-3xl font-bold">{searchParams.welcome ? "You're in. Welcome!" : "You have full access"}</h1>
        <p className="muted">All {total} questions across every level are unlocked on this browser{access.email ? ` for ${access.email}` : ""}.</p>
        <p className="text-sm muted">
          To use another device, open Pricing there and choose Restore access with your email and payment ID <code className="inline-code">{access.paymentId}</code>. Save that ID somewhere safe.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Link href="/#levels" className="btn btn-primary">Start preparing</Link>
          <SignOutButton />
        </div>
      </div>
    );
  }
  const perLevel = LEVELS.map((l) => allQuestions().filter((q) => q.level === l.id).length);
  const lockedTotal = total - FREE_PER_LEVEL * LEVELS.length;
  const rows: [string, string, string][] = [
    ["Questions", `First ${FREE_PER_LEVEL} of each level (${FREE_PER_LEVEL * LEVELS.length})`, `All ${total}, every level (${Math.min(...perLevel)}–${Math.max(...perLevel)} per level)`],
    ["60-second answer + explanation + example + code", "Free questions only", "Every question"],
    ["Ordered study path per level", "✓", "✓"],
    ["Flashcard mode", "Free cards only", `All ${total} cards`],
    ["Mock interview rounds", "Drawn from free questions", "Drawn from the full bank, weak-spot and per-topic rounds"],
    ["Live coding labs", `${ALL_SCENARIOS.filter((s) => s.free).length} free labs`, `All ${ALL_SCENARIOS.length} (incl. ${WORKSPACES.length} build-from-scratch workspaces), with Playwright + Selenium Java solutions`],
    ["Progress, bookmarks, weak-topic tracking", "✓", "✓"],
    ["New questions and levels as they're added", "—", "Included, no extra charge"],
    ["Devices", "Any", "Any: restore with your email + payment ID"],
  ];
  const faq: [string, string][] = [
    ["Is this a subscription?", `No. ${formatPrice()} once, and it stays unlocked. There are no renewals and nothing to cancel.`],
    ["Which level should I buy?", "There is one price for all five levels. Prepare for the role you're interviewing for, then skim the level above to handle the stretch questions."],
    ["Can I use it on my phone and laptop?", "Yes. Pay once, then on the other device open Pricing and use Restore access with the email you paid with and the payment ID from your Razorpay receipt."],
    ["Why not just read free blogs?", "Blogs give you facts in random order. Here each level is a path in the order interviewers go, every answer is written to be said out loud in a minute, and the mock rounds tell you what you don't know yet."],
    ["What if it isn't for me?", "Email us within 7 days of purchase and we'll refund you. See the refund policy for details."],
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="card p-6">
          <h1 className="text-2xl font-bold">Full access</h1>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold">{formatPrice()}</span>
            <span className="muted">one-time · {PRICE.label.toLowerCase()}</span>
          </div>
          <p className="mt-2 text-sm muted">Less than one hour of a paid mock interview, for every level and every future question.</p>
          <ul className="my-6 space-y-2">
            {[
              `All ${total} questions across ${LEVELS.length} levels, ${lockedTotal} of them Pro-only`,
              "60-second answer, explanation, example and code for each",
              "Mock interview rounds from the full bank, with weak-spot drills",
              "Flashcards for every question",
              `All ${ALL_SCENARIOS.length} live coding labs and framework workspaces, with Playwright and Selenium Java solutions`,
              "New questions as they're added, no extra charge",
              "One-time payment, no subscription",
            ].map((p) => <li key={p} className="flex gap-2"><span style={{ color: "var(--good)" }}>✓</span>{p}</li>)}
          </ul>
          <BuyButton label={`Unlock for ${formatPrice()}`} configured={razorpayConfigured()} />
          <p className="mt-3 text-xs muted">
            Secure payment by Razorpay: UPI, cards, netbanking and wallets. Instant access, no account needed.
            See our <Link href="/refunds" className="underline">refund policy</Link>.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Already paid?</h2>
          <p className="mb-4 mt-1 text-sm muted">Restore access on this device with the email you paid with and the payment ID from your Razorpay receipt email.</p>
          <RestoreForm />
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold">Free vs full access</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="px-4 py-3 text-left font-semibold"></th>
                <th className="px-4 py-3 text-left font-semibold">Free</th>
                <th className="px-4 py-3 text-left font-semibold accent">Full access</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, f, p]) => (
                <tr key={k} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-medium">{k}</td>
                  <td className="px-4 py-3 muted">{f}</td>
                  <td className="px-4 py-3">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Questions people ask</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {faq.map(([q, a]) => (
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
