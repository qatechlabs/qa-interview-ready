import { NextResponse } from "next/server";
import { fetchPayment, paymentGrantsAccess, razorpayConfigured } from "@/lib/razorpay";
import { grantResponse } from "@/lib/grant";

export const dynamic = "force-dynamic";

// Light per-instance throttle. Payment IDs are random, so guessing is impractical anyway.
const hits = new Map<string, { n: number; t: number }>();
function throttled(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 10 * 60_000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > 10;
}

export async function POST(req: Request) {
  if (!razorpayConfigured()) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const paymentId = String(body.paymentId || "").trim();
  if (!email || !/^pay_[A-Za-z0-9]{6,32}$/.test(paymentId)) {
    return NextResponse.json({ error: "Enter the email you paid with and a payment ID that starts with pay_." }, { status: 400 });
  }
  const fail = NextResponse.json({ error: "We couldn't find a completed purchase with that email and payment ID." }, { status: 404 });
  try {
    const payment = await fetchPayment(paymentId);
    if ((payment.email || "").toLowerCase() !== email) return fail;
    if (!(await paymentGrantsAccess(payment))) return fail;
    return grantResponse(email, payment.id);
  } catch {
    return fail;
  }
}
