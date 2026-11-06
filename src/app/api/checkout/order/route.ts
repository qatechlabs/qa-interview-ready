import { NextResponse } from "next/server";
import { SITE, formatPrice, isTierId, tier, tierAtLeast } from "@/lib/config";
import { getAccess } from "@/lib/access";
import { RazorpayError, createOrder, razorpayConfigured, upgradeAmount } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/** Body: { tier }. A visitor with a lower tier already is charged the difference. */
export async function POST(req: Request) {
  if (!razorpayConfigured()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { tier?: unknown };
  const target = isTierId(body.tier) ? tier(body.tier) : tier("prep");
  const access = await getAccess();
  if (access && tierAtLeast(access.tier, target.id)) return NextResponse.json({ error: `You already have ${tier(access.tier).name}.` }, { status: 400 });
  const upgradeFrom = access ? { paymentId: access.paymentId, tier: tier(access.tier) } : undefined;
  try {
    const order = await createOrder(target, upgradeFrom);
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      name: SITE.name,
      description: upgradeFrom ? `Upgrade ${upgradeFrom.tier.name} → ${target.name} (${formatPrice(upgradeAmount(target, upgradeFrom.tier))})` : `${target.name}: ${target.tagline}`,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof RazorpayError && e.status === 401) {
      return NextResponse.json({ error: "Payment provider rejected the API keys. Please contact support." }, { status: 401 });
    }
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
