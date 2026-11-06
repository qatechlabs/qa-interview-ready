import "server-only";
import crypto from "crypto";
import { PRICE } from "./config";

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function rp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: { description?: string } })?.error?.description || res.statusText;
    throw new Error(`Razorpay ${path}: ${msg}`);
  }
  return body as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string; // created | authorized | captured | refunded | failed
  email: string | null;
  notes?: Record<string, string> | unknown[];
  refund_status: string | null;
}

export function createOrder() {
  return rp<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: PRICE.amount,
      currency: PRICE.currency,
      receipt: `qir_${Date.now()}`,
      notes: { product: PRICE.productId },
    }),
  });
}

export function fetchOrder(orderId: string) {
  return rp<RazorpayOrder>(`/orders/${encodeURIComponent(orderId)}`);
}

export function fetchPayment(paymentId: string) {
  return rp<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

/** Verifies the signature Razorpay Checkout returns after a successful payment. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * A payment grants access when it is captured, not refunded, and belongs to an order
 * for this product at (at least) the current price.
 */
export async function paymentGrantsAccess(payment: RazorpayPayment) {
  if (payment.status !== "captured") return false;
  if (payment.refund_status) return false;
  if (!payment.order_id) return false;
  const order = await fetchOrder(payment.order_id);
  if (order.notes?.product !== PRICE.productId) return false;
  return payment.amount >= order.amount;
}

export function capturePayment(payment: RazorpayPayment) {
  return rp<RazorpayPayment>(`/payments/${encodeURIComponent(payment.id)}/capture`, {
    method: "POST",
    body: JSON.stringify({ amount: payment.amount, currency: payment.currency }),
  });
}
