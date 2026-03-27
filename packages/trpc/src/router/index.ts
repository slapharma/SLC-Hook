import { router } from "../init.js";
import { billingRouter } from "./billing.js";
import { connectedAccountsRouter } from "./connected-accounts.js";

export const appRouter = router({
  billing: billingRouter,
  connectedAccounts: connectedAccountsRouter,
});

export type AppRouter = typeof appRouter;
