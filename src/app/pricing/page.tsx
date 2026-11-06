import Link from "next/link";
import { LEVELS } from "@/content/meta";
import { allQuestions } from "@/content";
import { getAccess } from "@/lib/access";
import { razorpayConfigured } from "@/lib/razorpay";
import { FREE_PER_LEVEL, PRICE, formatPrice } from "@/lib/config";
import { BuyButton } from "@/components/BuyButton";
import { RestoreForm } from "@/components/RestoreForm";
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
  const perks = [
    `All ${total}+ questions across ${LEVELS.length} levels`,
    "60-second answer, explanation, example and code for each",
    "Flashcard mode for every level",
    "New questions as they're added",
    "One-time payment, no subscription",
  ];
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.3fr_1fr]">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Full access</h1>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-bold">{formatPrice()}</span>
          <span className="muted">one-time · {PRICE.label.toLowerCase()}</span>
        </div>
        <ul className="my-6 space-y-2">
          {perks.map((p) => <li key={p} className="flex gap-2"><span style={{ color: "var(--good)" }}>✓</span>{p}</li>)}
        </ul>
        <BuyButton label={`Unlock for ${formatPrice()}`} configured={razorpayConfigured()} />
        <p className="mt-3 text-xs muted">
          Secure payment by Razorpay: UPI, cards, netbanking and wallets. The first {FREE_PER_LEVEL} questions of every level stay free.
          See our <Link href="/refunds" className="underline">refund policy</Link>.
        </p>
      </div>
      <div className="card p-6">
        <h2 className="font-semibold">Already paid?</h2>
        <p className="mb-4 mt-1 text-sm muted">Restore access on this device with the email you paid with and the payment ID from your Razorpay receipt email.</p>
        <RestoreForm />
      </div>
    </div>
  );
}
