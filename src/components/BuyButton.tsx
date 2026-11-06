"use client";
import { useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
}

function loadScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function BuyButton({ label, configured, tier, primary = true }: { label: string; configured: boolean; tier: "prep" | "pro" | "architect"; primary?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setError(null);
    setBusy(true);
    try {
      if (!(await loadScript())) throw new Error("Couldn't load the payment window. Check your connection and try again.");
      const res = await fetch("/api/checkout/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || "Couldn't start checkout.");
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        theme: { color: "#4f46e5" },
        handler: async (resp: Record<string, string>) => {
          const v = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          });
          const out = await v.json();
          if (!v.ok) {
            setError(out.error || "Payment received but verification failed. Use 'Restore access' with your payment ID.");
            setBusy(false);
            return;
          }
          window.location.href = "/pricing?welcome=1";
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", (r: { error?: { description?: string } }) => {
        setError(r.error?.description || "Payment failed. You have not been charged.");
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button className={`btn ${primary ? "btn-primary" : "btn-ghost"} w-full !py-3 text-base`} onClick={buy} disabled={busy || !configured}>
        {busy ? "Opening checkout…" : label}
      </button>
      {!configured && <p className="mt-2 text-xs muted">Payments are not configured yet on this deployment.</p>}
      {error && <p className="mt-2 text-sm" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
