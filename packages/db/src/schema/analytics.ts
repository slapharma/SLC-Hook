import { pgTable, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { posts } from "./posts.js";
import { campaigns } from "./campaigns.js";
import { platformEnum } from "./connected-accounts.js";

export const postAnalytics = pgTable("post_analytics", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
  impressions: integer("impressions").notNull().default(0),
  reach: integer("reach").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  linkClicks: integer("link_clicks").notNull().default(0),
  followerDelta: integer("follower_delta").notNull().default(0),
  engagementRate: real("engagement_rate").notNull().default(0),
  replySentimentScore: real("reply_sentiment_score"),
});

export const funnelClicks = pgTable("funnel_clicks", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  postId: text("post_id").references(() => posts.id),
  shortlinkCode: text("shortlink_code").notNull(),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
  platform: platformEnum("platform"),
  anonymousUserHash: text("anonymous_user_hash"),
});

export const funnelConversions = pgTable("funnel_conversions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  funnelClickId: text("funnel_click_id").references(() => funnelClicks.id),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  source: text("source").notNull(),
  convertedAt: timestamp("converted_at", { withTimezone: true }).notNull().defaultNow(),
});
