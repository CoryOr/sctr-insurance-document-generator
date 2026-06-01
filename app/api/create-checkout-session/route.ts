// app/api/create-checkout-session/route.ts
import Stripe from "stripe";
import { verifyParseGuard } from "@/lib/parse-guard";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!origin) {
      return Response.json({ error: "Missing request origin" }, { status: 400 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return Response.json(
        { error: "Missing STRIPE_PRICE_ID in env" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const insurer = String(body?.insurer ?? "").toLowerCase();
    const parseToken = String(body?.parseToken ?? "");

    if (!insurer || !parseToken) {
      return Response.json(
        { error: "Missing insurer or parseToken" },
        { status: 400 }
      );
    }

    const guard = verifyParseGuard(parseToken);
    if (!guard) {
      return Response.json(
        { error: "Invalid or expired parse token" },
        { status: 400 }
      );
    }

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
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Stripe error" },
      { status: 500 }
    );
  }
}