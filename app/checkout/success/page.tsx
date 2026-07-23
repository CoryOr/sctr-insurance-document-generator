/**
 * Stripe Checkout success route for the SCTR Insurance Document Generator.
 *
 * This server component reads the Stripe Checkout session ID from the success
 * redirect URL and passes it to the client-side success component.
 *
 * The client component is responsible for notifying the original application
 * window that payment completed and for attempting to close the checkout tab.
 */

import CheckoutSuccessClient from "./checkout-success-client";

/**
 * Shape of the query parameters supplied to this App Router page.
 */
type CheckoutSuccessPageProps = {
  /**
   * Search parameters provided by Next.js for the current request.
   */
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

/**
 * Extracts the Stripe Checkout session ID from the redirect URL.
 *
 * @param searchParams - Query parameters included in Stripe's success redirect.
 * @returns The client component configured with the validated session ID.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  /*
   * Resolve the asynchronous search-parameter object provided by Next.js.
   */
  const sp = await searchParams;

  /*
   * Stripe sends the Checkout session identifier through the `session_id`
   * query parameter. Ignore arrays or missing values so the client receives a
   * predictable string-or-null value.
   */
  const sessionId =
    typeof sp.session_id === "string" ? sp.session_id : null;

  /*
   * Delegate browser-only work, including BroadcastChannel communication and
   * window closing, to the client component.
   */
  return <CheckoutSuccessClient sessionId={sessionId} />;
}