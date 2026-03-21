import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Variabile d'ambiente mancante: STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey);
  }

  return stripeClient;
}

export function getStripePriceId(): string {
  const stripePriceId = process.env.STRIPE_PRICE_ID;

  if (!stripePriceId) {
    throw new Error("Variabile d'ambiente mancante: STRIPE_PRICE_ID");
  }

  return stripePriceId;
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Variabile d'ambiente mancante: STRIPE_WEBHOOK_SECRET");
  }

  return webhookSecret;
}
