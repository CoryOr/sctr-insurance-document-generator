/**
 * Client-side payment and PDF-generation control for the SCTR workflow.
 *
 * This component starts a Stripe Checkout session, opens the hosted checkout
 * page in a popup window, listens for the successful-payment notification, and
 * verifies the completed payment before requesting final PDF generation.
 *
 * Workflow:
 * 1. Confirm that a valid parse-guard token is available.
 * 2. Request a Stripe Checkout session from the server.
 * 3. Open Stripe Checkout in a separate browser window.
 * 4. Listen for the success page through the `stripe-checkout` channel.
 * 5. Verify the Checkout session with the server.
 * 6. Invoke the supplied PDF-generation callback with the paid session ID.
 */

"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/getErrorMessage";

/**
 * Props accepted by the payment and generation button.
 */
type PayAndGenerateButtonProps = {
  /**
   * Insurer key associated with the validated Excel workbook.
   */
  insurer: string;

  /**
   * Signed token proving that the workbook passed parsing and validation.
   */
  parseToken: string | null;

  /**
   * Optional external flag used to prevent checkout.
   */
  disabled?: boolean;

  /**
   * Callback that generates the final PDF after payment is verified.
   */
  onGeneratePdf: (sessionId: string) => Promise<void>;
};

/**
 * Starts Stripe Checkout and continues PDF generation after verified payment.
 *
 * @param insurer - Selected insurer for the current SCTR job.
 * @param parseToken - Signed workbook-validation token.
 * @param disabled - Optional external disabled state.
 * @param onGeneratePdf - Callback invoked with the paid Checkout session ID.
 * @returns A button reflecting the current checkout and generation state.
 */
export default function PayAndGenerateButton({
  insurer,
  parseToken,
  disabled,
  onGeneratePdf,
}: PayAndGenerateButtonProps) {
  /**
   * Indicates that a checkout, verification, or generation request is active.
   */
  const [loading, setLoading] = useState(false);

  /**
   * Indicates that Stripe Checkout is open and the component is waiting for
   * the customer to complete payment.
   */
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    /*
     * Listen for the success message sent by the Stripe return page. The same
     * BroadcastChannel name must be used by both browser contexts.
     */
    const bc = new BroadcastChannel("stripe-checkout");

    bc.onmessage = async (event) => {
      /*
       * Ignore unrelated messages that may be published to the shared channel.
       */
      if (event.data?.type !== "stripe-checkout-success") return;

      const sessionId = event.data?.sessionId as string | undefined;

      if (!sessionId) return;

      setLoading(true);

      try {
        /*
         * Verify the Checkout session on the server instead of trusting the
         * success message or client-provided payment state.
         */
        const res = await fetch("/api/verify-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (!res.ok || !data.paid) {
          throw new Error(data?.error || "Payment not verified");
        }

        /*
         * Continue the document workflow only after Stripe confirms payment.
         */
        await onGeneratePdf(sessionId);
      } catch (error: unknown) {
        alert(getErrorMessage(error, "Payment verification failed"));
      } finally {
        /*
         * Reset both states whether verification or PDF generation succeeds or
         * fails, allowing the user to retry when necessary.
         */
        setLoading(false);
        setWaiting(false);
      }
    };

    /*
     * Close the channel when the component unmounts or the callback changes.
     */
    return () => bc.close();
  }, [onGeneratePdf]);

  /**
   * Creates and opens a Stripe Checkout session for the validated workbook.
   */
  async function startCheckout() {
    /*
     * Checkout is not allowed until the uploaded Excel file has passed the
     * insurer-template and row-validation checks.
     */
    if (!parseToken) {
      alert("Please upload the correct Excel template first.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Request a hosted Checkout URL associated with the selected insurer and
       * signed parse token.
       */
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insurer,
          parseToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Checkout error");
      }

      if (!data.url) {
        throw new Error("Missing checkout URL");
      }

      /*
       * Switch the label to the waiting state before opening Stripe Checkout.
       */
      setWaiting(true);

      const w = window.open(
        data.url,
        "stripeCheckout",
        "width=520,height=720"
      );

      /*
       * Browsers may block script-opened windows. Reset the waiting state and
       * tell the user to allow popups before trying again.
       */
      if (!w) {
        setWaiting(false);
        alert(
          "Popup blocked. Please allow popups for localhost:3000 and try again."
        );
      }
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Checkout failed"));
      setWaiting(false);
    } finally {
      setLoading(false);
    }
  }

  /*
   * Prevent payment when the parent workflow is disabled or no valid parse
   * token is available.
   */
  const blocked = Boolean(disabled) || !parseToken;

  /*
   * Reflect the current stage of the payment workflow in the button label.
   */
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