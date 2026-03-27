import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { creators } from "./creators.js";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const oauthAccounts = pgTable("oauth_accounts", {
  providerId: text("provider_id").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  userId: text("user_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
});
