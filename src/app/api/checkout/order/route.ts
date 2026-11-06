import { NextResponse } from "next/server";
import { PRICE, SITE } from "@/lib/config";
import { RazorpayError, createOrder, razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!razorpayConfigured()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }
  try {
    const order = await createOrder();
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      name: SITE.name,
      description: `${PRICE.label}: every level and question`,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof RazorpayError && e.status === 401) {
      return NextResponse.json({ error: "Payment provider rejected the API keys. Please contact support." }, { status: 401 });
    }
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
