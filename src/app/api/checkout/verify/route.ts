import { NextResponse } from "next/server";
import { capturePayment, fetchPayment, paymentGrantsAccess, razorpayConfigured, verifyCheckoutSignature } from "@/lib/razorpay";
import { grantResponse } from "@/lib/grant";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!razorpayConfigured()) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.razorpay_order_id || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");
  if (!orderId || !paymentId || !verifyCheckoutSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ error: "Payment signature is invalid." }, { status: 400 });
  }
  try {
    let payment = await fetchPayment(paymentId);
    if (payment.order_id !== orderId) return NextResponse.json({ error: "Payment does not match order." }, { status: 400 });
    if (payment.status === "authorized") payment = await capturePayment(payment);
    const tier = await paymentGrantsAccess(payment);
    if (!tier) {
      return NextResponse.json({ error: "Payment is not complete yet. Try 'Restore access' in a minute." }, { status: 402 });
    }
    return grantResponse((payment.email || "").toLowerCase(), payment.id, tier);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't verify the payment. Use 'Restore access' with your payment ID." }, { status: 502 });
  }
}
