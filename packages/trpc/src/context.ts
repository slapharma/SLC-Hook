import { db } from "@hook/db";
import type { DB } from "@hook/db";

export type Context = {
  db: DB;
  userId: string | null;
  userTier: "free" | "creator" | "pro" | null;
};

export function createContext(
  userId: string | null,
  userTier: "free" | "creator" | "pro" | null
): Context {
  return { db, userId, userTier };
}
