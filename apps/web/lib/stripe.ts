import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20" as any,
  typescript: true,
});

export const PLANS = {
  creator: {
    priceId: process.env.STRIPE_CREATOR_PRICE_ID!,
    tier: "creator" as const,
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    tier: "pro" as const,
  },
} as const;
