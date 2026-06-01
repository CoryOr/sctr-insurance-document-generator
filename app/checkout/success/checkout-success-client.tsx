// app/checkout/success/checkout-success-client.tsx
"use client";

import { useEffect } from "react";

export default function CheckoutSuccessClient({
  sessionId,
}: {
  sessionId: string | null;
}) {
  useEffect(() => {
    if (!sessionId) return;

    const bc = new BroadcastChannel("stripe-checkout");
    bc.postMessage({ type: "stripe-checkout-success", sessionId });
    bc.close();

    window.close();
  }, [sessionId]);

  return (
    <main style={{ padding: 24 }}>
      <p>Payment complete. You can close this window.</p>
    </main>
  );
}