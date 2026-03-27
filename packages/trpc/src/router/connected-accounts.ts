import { z } from "zod";
import { protectedProcedure, router } from "../init.js";
import { connectedAccounts } from "@hook/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const TIER_ACCOUNT_LIMITS = {
  free: 1,
  creator: 3,
  pro: Infinity,
} as const;

export const connectedAccountsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: connectedAccounts.id,
        platform: connectedAccounts.platform,
        handle: connectedAccounts.handle,
        displayName: connectedAccounts.displayName,
        avatarUrl: connectedAccounts.avatarUrl,
        authStatus: connectedAccounts.authStatus,
        connectedAt: connectedAccounts.connectedAt,
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.creatorId, ctx.userId));
  }),

  disconnect: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(connectedAccounts)
        .where(
          and(
            eq(connectedAccounts.id, input.accountId),
            eq(connectedAccounts.creatorId, ctx.userId)
          )
        );
    }),

  checkTierLimit: protectedProcedure
    .input(
      z.object({ platform: z.enum(["x", "tiktok", "instagram", "linkedin"]) })
    )
    .query(async ({ input, ctx }) => {
      const existing = await ctx.db
        .select()
        .from(connectedAccounts)
        .where(
          and(
            eq(connectedAccounts.creatorId, ctx.userId),
            eq(connectedAccounts.platform, input.platform)
          )
        );
      const limit = TIER_ACCOUNT_LIMITS[ctx.userTier ?? "free"];
      if (existing.length >= limit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Upgrade your plan to connect more ${input.platform} accounts`,
        });
      }
      return { canAdd: true, current: existing.length, limit };
    }),
});
