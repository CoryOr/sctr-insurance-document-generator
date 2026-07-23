/**
 * Stripe checkout-session API route for SCTR Insurance Document Generator.
 *
 * This endpoint creates a one-time Stripe Checkout session after confirming
 * that the uploaded Excel file passed the application's parse-guard checks.
 *
 * Request body:
 * - `insurer`: The insurer selected by the user.
 * - `parseToken`: A signed token produced after validating the Excel template.
 *
 * Validation performed before checkout:
 * - Confirms the request includes an origin header.
 * - Confirms the Stripe price ID is configured.
 * - Confirms the insurer and parse token are present.
 * - Verifies that the parse token is valid and has not expired.
 * - Ensures the selected insurer matches the insurer detected in the workbook.
 * - Prevents payment when workbook validation issues remain.
 *
 * Successful requests return the hosted Stripe Checkout URL.
 */

import Stripe from "stripe";
import { verifyParseGuard } from "@/lib/parse-guard";
import { getErrorMessage } from "@/lib/getErrorMessage";

/**
 * Stripe's Node.js SDK requires the Node.js runtime rather than the Edge runtime.
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
 * Creates a Stripe Checkout session for a validated SCTR document request.
 *
 * @param req - Incoming request containing the insurer and parse-guard token.
 * @returns A JSON response containing the Checkout URL or an error message.
 */
export async function POST(req: Request) {
  try {
    /*
     * Use the request origin to build the absolute success and cancellation
     * URLs that Stripe will redirect the customer to after checkout.
     */
    const origin = req.headers.get("origin");

    if (!origin) {
      return Response.json({ error: "Missing request origin" }, { status: 400 });
    }

    /*
     * The Stripe Price ID identifies the one-time product configured for the
     * SCTR document-generation payment.
     */
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      return Response.json(
        { error: "Missing STRIPE_PRICE_ID in env" },
        { status: 400 }
      );
    }

    /*
     * Gracefully handle malformed JSON. Normalizing both values to strings
     * prevents unexpected request-body types from reaching later checks.
     */
    const body = await req.json().catch(() => null);
    const insurer = String(body?.insurer ?? "").toLowerCase();
    const parseToken = String(body?.parseToken ?? "");

    if (!insurer || !parseToken) {
      return Response.json(
        { error: "Missing insurer or parseToken" },
        { status: 400 }
      );
    }

    /*
     * Verify the signed parse token before trusting any workbook-validation
     * results submitted by the client.
     */
    const guard = verifyParseGuard(parseToken);

    if (!guard) {
      return Response.json(
        { error: "Invalid or expired parse token" },
        { status: 400 }
      );
    }

    /*
     * Allow checkout only when:
     * - Parsing completed successfully.
     * - No validation issues remain.
     * - The selected insurer matches the token.
     * - The workbook's detected insurer matches the selected insurer.
     *
     * This prevents customers from paying for an incompatible Excel template.
     */
    if (
      !guard.canProceed ||
      guard.issuesCount > 0 ||
      guard.selectedInsurer !== insurer ||
      guard.detectedInsurer !== insurer
    ) {
      return Response.json(
        {
          error: `Wrong Excel template. Selected "${insurer}", detected "${guard.detectedInsurer}".`,
        },
        { status: 400 }
      );
    }

    /*
     * Create a hosted, one-time Stripe Checkout session. The insurer and parse
     * token are stored as metadata so downstream payment and document-generation
     * logic can associate the completed session with the validated workbook.
     */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      metadata: {
        insurer,
        parseToken,
      },
    });

    return Response.json({ url: session.url });
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error, "Stripe error") },
      { status: 500 }
    );
  }
}