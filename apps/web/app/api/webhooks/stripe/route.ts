import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@hook/db";
import { creators } from "@hook/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20" as any,
  typescript: true,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price.id;
    const tier =
      priceId === process.env.STRIPE_CREATOR_PRICE_ID
        ? "creator"
        : priceId === process.env.STRIPE_PRO_PRICE_ID
          ? "pro"
          : "free";

    await db
      .update(creators)
      .set({ subscriptionTier: tier, stripeSubscriptionId: sub.id })
      .where(eq(creators.stripeCustomerId, sub.customer as string));
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await db
      .update(creators)
      .set({ subscriptionTier: "free", stripeSubscriptionId: null })
      .where(eq(creators.stripeCustomerId, sub.customer as string));
  }

  return NextResponse.json({ received: true });
}
