/**
 * Stripe Checkout cancellation page for the SCTR Insurance Document Generator.
 *
 * This page is shown when a customer leaves or cancels the hosted Stripe
 * Checkout flow before completing payment.
 *
 * The page intentionally keeps the message simple because no payment or
 * document-generation action is performed here.
 */

/**
 * Displays a confirmation message after Stripe Checkout is canceled.
 *
 * @returns A minimal page informing the user that payment was not completed.
 */
export default function CheckoutCancel() {
  return (
    <main style={{ padding: 24 }}>
      {/* Reassure the user that the canceled checkout requires no further action. */}
      <p>Payment canceled. You can close this window.</p>
    </main>
  );
}