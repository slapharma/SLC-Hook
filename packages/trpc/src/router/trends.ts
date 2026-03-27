import { z } from "zod";
import { protectedProcedure, router } from "../init.js";
import { trendSignals } from "@hook/db/schema";
import { desc, eq, gte } from "drizzle-orm";

export const trendsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          platform: z.enum(["x", "tiktok", "instagram", "linkedin"]).optional(),
          status: z
            .enum(["breaking", "rising", "established", "saturated"])
            .optional(),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
      const rows = await ctx.db
        .select()
        .from(trendSignals)
        .where(gte(trendSignals.detectedAt, since))
        .orderBy(desc(trendSignals.opportunityScore))
        .limit(input?.limit ?? 20);

      // Apply optional filters post-fetch (simpler than building dynamic where)
      return rows.filter((r) => {
        if (input?.platform && r.platform !== input.platform) return false;
        if (input?.status && r.status !== input.status) return false;
        return true;
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [trend] = await ctx.db
        .select()
        .from(trendSignals)
        .where(eq(trendSignals.id, input.id))
        .limit(1);
      return trend ?? null;
    }),
});
