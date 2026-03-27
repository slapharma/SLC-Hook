import { router } from "../init.js";
import { billingRouter } from "./billing.js";

export const appRouter = router({
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
