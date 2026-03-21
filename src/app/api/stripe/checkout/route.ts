import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripePriceId, getStripeServerClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const stripe = getStripeServerClient();
    const stripePriceId = getStripePriceId();
    const origin = new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/billing?checkout=success`,
      cancel_url: `${origin}/dashboard/billing?checkout=cancel`,
      client_reference_id: userId,
      metadata: {
        clerk_user_id: userId,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          clerk_user_id: userId,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Impossibile creare la sessione Checkout Stripe." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore inatteso durante la creazione della Checkout Session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
