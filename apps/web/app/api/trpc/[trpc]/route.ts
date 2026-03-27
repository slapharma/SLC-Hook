import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@hook/trpc";
import { getSession } from "@/lib/session";
import type { NextRequest } from "next/server";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const { user } = await getSession();
      return createContext(user?.id ?? null, user?.subscriptionTier ?? null);
    },
  });

export { handler as GET, handler as POST };
