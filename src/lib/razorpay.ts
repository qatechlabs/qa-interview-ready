import "server-only";
import crypto from "crypto";
import { PRICE, tierForProduct, type Tier, type TierId } from "./config";

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export class RazorpayError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
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
    throw new RazorpayError(`Razorpay ${path}: ${msg}`, res.status);
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

/** Razorpay rejects orders below 100 paise (₹1). */
export const MIN_AMOUNT = 100;

/** Amount charged for `target` when upgrading from `from` (the difference, never below the minimum). */
export function upgradeAmount(target: Tier, from: Tier | null) {
  return Math.max(MIN_AMOUNT, target.amount - (from?.amount || 0));
}

/**
 * Creates the order for a tier. An upgrade carries the payment it upgrades from in the notes,
 * so the difference is charged and the upgrade can be verified later from the payment alone.
 */
export function createOrder(target: Tier, upgradeFrom?: { paymentId: string; tier: Tier }) {
  const amount = upgradeAmount(target, upgradeFrom?.tier || null);
  if (!Number.isInteger(amount) || amount < MIN_AMOUNT) {
    throw new Error(`Tier amounts must be integers of at least ${MIN_AMOUNT} (smallest currency unit); got ${amount}`);
  }
  return rp<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: PRICE.currency,
      receipt: `qir_${Date.now()}`,
      notes: { product: target.productId, ...(upgradeFrom ? { upgrade_from: upgradeFrom.paymentId } : {}) },
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
 * The tier a payment grants: captured, not refunded, for an order of one of our products at (at least)
 * the order's amount. An upgrade order also needs the payment it upgraded from to be valid.
 */
export async function paymentGrantsAccess(payment: RazorpayPayment, depth = 0): Promise<TierId | null> {
  if (payment.status !== "captured") return null;
  if (payment.refund_status) return null;
  if (!payment.order_id) return null;
  const order = await fetchOrder(payment.order_id);
  const target = tierForProduct(order.notes?.product);
  if (!target) return null;
  if (payment.amount < order.amount) return null;
  const from = order.notes?.upgrade_from;
  if (from) {
    if (depth > 3) return null;
    const base = await paymentGrantsAccess(await fetchPayment(from), depth + 1);
    if (!base) return null;
  }
  return target.id;
}

export function capturePayment(payment: RazorpayPayment) {
  return rp<RazorpayPayment>(`/payments/${encodeURIComponent(payment.id)}/capture`, {
    method: "POST",
    body: JSON.stringify({ amount: payment.amount, currency: payment.currency }),
  });
}
