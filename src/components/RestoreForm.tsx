"use client";
import { useState } from "react";

export function RestoreForm() {
  const [email, setEmail] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch("/api/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, paymentId }),
        });
        const out = await res.json().catch(() => ({}));
        setBusy(false);
        if (res.ok) window.location.href = "/pricing?welcome=1";
        else setMsg(out.error || "Couldn't restore access.");
      }}
    >
      <input required type="email" placeholder="Email used at checkout" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
      <input required placeholder="Payment ID (starts with pay_)" value={paymentId} onChange={(e) => setPaymentId(e.target.value.trim())} className="w-full rounded-lg border px-3 py-2 font-mono text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
      <button className="btn btn-ghost w-full" disabled={busy}>{busy ? "Checking…" : "Restore access"}</button>
      {msg && <p className="text-sm" style={{ color: "#dc2626" }}>{msg}</p>}
    </form>
  );
}
