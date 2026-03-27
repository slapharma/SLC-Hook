import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId, userTier: ctx.userTier! } });
});

export const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userTier === "free") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Upgrade to Creator" });
  }
  return next({ ctx });
});

export const proProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userTier !== "pro") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Upgrade to Pro" });
  }
  return next({ ctx });
});
