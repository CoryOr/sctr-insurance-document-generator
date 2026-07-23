/**
 * Client-side Stripe Checkout success page for the SCTR Insurance Document Generator.
 *
 * This component runs after Stripe redirects the customer to the successful
 * checkout route. It notifies the original application window that payment was
 * completed, passes back the Stripe Checkout session ID, and then attempts to
 * close the checkout window.
 *
 * Communication uses the browser BroadcastChannel API so the parent page can
 * continue the paid SCTR PDF-generation workflow.
 */

"use client";

import { useEffect } from "react";

/**
 * Props accepted by the checkout success client component.
 */
type CheckoutSuccessClientProps = {
  /**
   * Stripe Checkout session identifier read from the success-page URL.
   */
  sessionId: string | null;
};

/**
 * Notifies the original application window that Stripe Checkout succeeded.
 *
 * @param sessionId - Stripe Checkout session identifier returned after payment.
 * @returns A minimal confirmation page displayed while the window closes.
 */
export default function CheckoutSuccessClient({
  sessionId,
}: CheckoutSuccessClientProps) {
  useEffect(() => {
    /*
     * Do not broadcast a success event when the redirect URL does not include a
     * Checkout session ID.
     */
    if (!sessionId) return;

    /*
     * Notify other application contexts listening on the same channel. The
     * original SCTR workflow can use the session ID to verify payment and resume
     * PDF generation.
     */
    const bc = new BroadcastChannel("stripe-checkout");

    bc.postMessage({
      type: "stripe-checkout-success",
      sessionId,
    });

    /*
     * Release the channel immediately because this page sends only one message.
     */
    bc.close();

    /*
     * Attempt to close the popup or tab opened for Stripe Checkout. Browsers may
     * ignore this call when the window was not opened by script.
     */
    window.close();
  }, [sessionId]);

  return (
    <main style={{ padding: 24 }}>
      {/* Fallback message remains visible if the browser does not close the window. */}
      <p>Payment complete. You can close this window.</p>
    </main>
  );
}