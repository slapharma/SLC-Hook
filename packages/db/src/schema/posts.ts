import { pgTable, text, timestamp, pgEnum, integer, real, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { campaigns } from "./campaigns.js";
import { connectedAccounts, platformEnum } from "./connected-accounts.js";
import { trendSignals } from "./trends.js";

export const postStatusEnum = pgEnum("post_status", [
  "draft", "approved", "scheduled", "publishing", "published", "failed", "dead_letter", "paused"
]);

export const hookFrameworkEnum = pgEnum("hook_framework", [
  "curiosity_gap", "contrarian", "number_list", "personal_stakes", "bold_claim"
]);

export const campaignPosts = pgTable("campaign_posts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  contentBody: text("content_body").notNull(),
  hookText: text("hook_text").notNull(),
  hookFramework: hookFrameworkEnum("hook_framework").notNull(),
  trendSignalId: text("trend_signal_id").references(() => trendSignals.id),
  mediaR2Keys: text("media_r2_keys").array().notNull().default([]),
  mediaAltTexts: text("media_alt_texts").array().notNull().default([]),
  predictedViralScore: real("predicted_viral_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  campaignPostId: text("campaign_post_id").notNull().references(() => campaignPosts.id, { onDelete: "cascade" }),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  connectedAccountId: text("connected_account_id").notNull().references(() => connectedAccounts.id),
  platform: platformEnum("platform").notNull(),
  contentBodyFormatted: text("content_body_formatted").notNull(),
  status: postStatusEnum("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedPlatformId: text("published_platform_id"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  publishAttempts: integer("publish_attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
