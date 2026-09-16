import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Singleton Stripe.js loader — loadStripe() must only ever be called once
 * per publishable key (calling it again on every render/remount re-injects
 * the Stripe.js script). LOT B chantier 3b/3c are this repo's first use of
 * Stripe Elements client-side.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (!publishableKey) {
      console.error("VITE_STRIPE_PUBLISHABLE_KEY is not set — Stripe Elements cannot load.");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey, { locale: "fr" });
  }
  return stripePromise;
}
