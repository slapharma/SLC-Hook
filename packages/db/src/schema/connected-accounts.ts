import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { creators } from "./creators.js";

export const platformEnum = pgEnum("platform", ["x", "tiktok", "instagram", "linkedin"]);
export const authStatusEnum = pgEnum("auth_status", ["active", "requires_reauth", "suspended", "disconnected"]);

export const connectedAccounts = pgTable("connected_accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  creatorId: text("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  platformAccountId: text("platform_account_id").notNull(),
  handle: text("handle").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  encryptionKeyId: text("encryption_key_id").notNull().default("v1"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  scopes: text("scopes").array().notNull().default([]),
  rateLimitState: jsonb("rate_limit_state").$type<{
    remaining: number;
    resetAt: string;
    endpoint: string;
  }>(),
  authStatus: authStatusEnum("auth_status").notNull().default("active"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  lastSuccessfulPostAt: timestamp("last_successful_post_at", { withTimezone: true }),
});
