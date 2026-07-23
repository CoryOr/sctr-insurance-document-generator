/**
 * Stripe Checkout verification API route for the SCTR Insurance Document Generator.
 *
 * This endpoint receives a Stripe Checkout session ID, retrieves the matching
 * session from Stripe, and returns whether the associated payment has been
 * completed.
 *
 * Request body:
 * - `sessionId`: The Stripe Checkout session identifier returned after payment.
 *
 * Response:
 * - `paid`: Indicates whether Stripe reports the payment as fully paid.
 * - `payment_status`: The raw payment status returned by Stripe.
 */

import Stripe from "stripe";
import { getErrorMessage } from "@/lib/getErrorMessage";

/**
 * Stripe's server-side SDK requires the Node.js runtime.
 */
export const runtime = "nodejs";

/**
 * Shared Stripe client initialized with the server-only secret key.
 *
 * The non-null assertion assumes `STRIPE_SECRET_KEY` is configured in the
 * deployment environment.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Verifies the payment status of a Stripe Checkout session.
 *
 * @param req - Incoming request containing a Stripe Checkout session ID.
 * @returns A JSON response with the payment status or an error message.
 */
export async function POST(req: Request) {
  try {
    /*
     * Read the Checkout session ID supplied by the client after Stripe redirects
     * the customer back to the application.
     */
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    /*
     * Retrieve the session directly from Stripe rather than trusting a
     * client-provided payment result.
     */
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    /*
     * Return both a convenient boolean and Stripe's original status value so
     * the client can handle paid and non-paid states appropriately.
     */
    return Response.json({
      paid: session.payment_status === "paid",
      payment_status: session.payment_status,
    });
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error, "Verify error") },
      { status: 500 }
    );
  }
}