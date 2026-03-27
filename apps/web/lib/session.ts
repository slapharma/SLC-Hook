import { cache } from "react";
import { cookies } from "next/headers";
import { lucia } from "./auth";

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) return { user: null, session: null };
  const result = await lucia.validateSession(sessionId);
  return result;
});

export async function requireAuth() {
  const { user, session } = await getSession();
  if (!user || !session) throw new Error("Unauthorized");
  return { user, session };
}
