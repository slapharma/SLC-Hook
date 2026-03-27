import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../init.js";
import { creators } from "@hook/db/schema";
import { eq } from "drizzle-orm";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-11-20" as any,
    typescript: true,
  });
}

export const billingRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({ plan: z.enum(["creator", "pro"]) }))
    .mutation(async ({ input, ctx }) => {
      const stripe = getStripe();
      const [creator] = await ctx.db
        .select()
        .from(creators)
        .where(eq(creators.id, ctx.userId));

      const priceId =
        input.plan === "creator"
          ? process.env.STRIPE_CREATOR_PRICE_ID!
          : process.env.STRIPE_PRO_PRICE_ID!;

      let customerId = creator.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: creator.email,
          name: creator.name,
        });
        customerId = customer.id;
        await ctx.db
          .update(creators)
          .set({ stripeCustomerId: customerId })
          .where(eq(creators.id, ctx.userId));
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
        currency: "gbp",
      });

      return { url: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe();
    const [creator] = await ctx.db
      .select()
      .from(creators)
      .where(eq(creators.id, ctx.userId));

    if (!creator.stripeCustomerId) {
      throw new Error("No billing account");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: creator.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });
    return { url: session.url };
  }),
});
