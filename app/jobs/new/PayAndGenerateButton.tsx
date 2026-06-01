// app/jobs/new/PayAndGenerateButton.tsx
"use client";

import { useEffect, useState } from "react";

export default function PayAndGenerateButton({
  insurer,
  parseToken,
  disabled,
  onGeneratePdf,
}: {
  insurer: string;
  parseToken: string | null;
  disabled?: boolean;
  onGeneratePdf: (sessionId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const bc = new BroadcastChannel("stripe-checkout");

    bc.onmessage = async (event) => {
      if (event.data?.type !== "stripe-checkout-success") return;

      const sessionId = event.data?.sessionId as string | undefined;
      if (!sessionId) return;

      setLoading(true);
      try {
        const res = await fetch("/api/verify-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();

        if (!res.ok || !data.paid) {
          throw new Error(data?.error || "Payment not verified");
        }

        await onGeneratePdf(sessionId);
      } catch (err: any) {
        alert(err?.message || "Payment verification failed");
      } finally {
        setLoading(false);
        setWaiting(false);
      }
    };

    return () => bc.close();
  }, [onGeneratePdf]);

  async function startCheckout() {
    if (!parseToken) {
      alert("Please upload the correct Excel template first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insurer,
          parseToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Checkout error");
      if (!data.url) throw new Error("Missing checkout URL");

      setWaiting(true);

      const w = window.open(data.url, "stripeCheckout", "width=520,height=720");

      if (!w) {
        setWaiting(false);
        alert("Popup blocked. Please allow popups for localhost:3000 and try again.");
      }
    } catch (err: any) {
      alert(err?.message || "Checkout failed");
      setWaiting(false);
    } finally {
      setLoading(false);
    }
  }

  const blocked = Boolean(disabled) || !parseToken;
  const label = loading
    ? "Processing…"
    : waiting
    ? "Waiting for payment…"
    : "Pay & Generate PDF";

  return (
    <button
      onClick={startCheckout}
      disabled={blocked || loading || waiting}
      className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-40"
    >
      {label}
    </button>
  );
}