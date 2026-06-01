// app/api/verify-checkout-session/route.ts

import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return Response.json({
      paid: session.payment_status === "paid",
      payment_status: session.payment_status,
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Verify error" },
      { status: 500 }
    );
  }
}
