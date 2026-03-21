import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getStripeServerClient,
  getStripeWebhookSecret,
} from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SubscriptionUpsert = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  status: string;
};

function extractCurrentPeriodEnd(
  subscription: Stripe.Subscription
): number | null {
  const firstItem = subscription.items.data[0];
  return firstItem?.current_period_end ?? null;
}

function toIsoFromUnix(seconds?: number | null): string | null {
  if (!seconds) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
}

function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) {
    return null;
  }

  if (typeof customer === "string") {
    return customer;
  }

  return customer.id ?? null;
}

async function findUserIdByStripeCustomerId(
  stripeCustomerId: string
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Lookup abbonamento fallito: ${error.message}`);
  }

  const row = (data as { user_id: string } | null) ?? null;
  return row?.user_id ?? null;
}

async function upsertSubscription(row: SubscriptionUpsert): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("user_subscriptions")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Upsert abbonamento fallito: ${error.message}`);
  }
}

async function syncFromCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.mode !== "subscription") {
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    throw new Error("Checkout session senza subscription id.");
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscription = stripeSubscription as unknown as Stripe.Subscription;
  const customerId = extractCustomerId(subscription.customer);

  let userId: string | null =
    session.metadata?.clerk_user_id ?? session.client_reference_id ?? null;

  if (!userId && customerId) {
    userId = await findUserIdByStripeCustomerId(customerId);
  }

  if (!userId) {
    throw new Error("Impossibile ricavare userId Clerk dalla checkout session.");
  }

  await upsertSubscription({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
    stripe_current_period_end: toIsoFromUnix(
      extractCurrentPeriodEnd(subscription)
    ),
    status: subscription.status,
  });
}

async function syncFromSubscriptionObject(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = extractCustomerId(subscription.customer);
  let userId: string | null = subscription.metadata?.clerk_user_id ?? null;

  if (!userId && customerId) {
    userId = await findUserIdByStripeCustomerId(customerId);
  }

  if (!userId) {
    return;
  }

  await upsertSubscription({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
    stripe_current_period_end: toIsoFromUnix(
      extractCurrentPeriodEnd(subscription)
    ),
    status: subscription.status,
  });
}

export async function POST(request: Request) {
  const stripe = getStripeServerClient();
  const webhookSecret = getStripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Firma webhook Stripe mancante." },
      { status: 400 }
    );
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Firma webhook invalida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncFromCheckoutSession(stripe, session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncFromSubscriptionObject(subscription);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore durante l'elaborazione webhook Stripe.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
