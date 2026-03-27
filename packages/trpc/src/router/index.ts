import { router } from "../init.js";
import { billingRouter } from "./billing.js";
import { connectedAccountsRouter } from "./connected-accounts.js";
import { trendsRouter } from "./trends.js";

export const appRouter = router({
  billing: billingRouter,
  connectedAccounts: connectedAccountsRouter,
  trends: trendsRouter,
});

export type AppRouter = typeof appRouter;
