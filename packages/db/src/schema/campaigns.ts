import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { creators } from "./creators.js";

export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "active", "paused", "archived"]);
export const funnelTypeEnum = pgEnum("funnel_type", ["email_capture", "direct_sale", "affiliate", "sponsorship"]);

export type ContentRules = {
  tone: "educational" | "entertaining" | "motivational" | "controversial";
  contentToPromotionRatio: number;
  topicsInclude: string[];
  topicsAvoid: string[];
  brandVoiceKeywords: string[];
};

export type ScheduleStrategy = {
  type: "power_hours" | "consistency_ladder" | "trend_surfing" | "cross_platform_cascade" | "evergreen_trending_mix" | "thread_bombing";
  config: Record<string, unknown>;
};

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  creatorId: text("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  nicheKeywords: text("niche_keywords").array().notNull().default([]),
  competitorHandles: text("competitor_handles").array().notNull().default([]),
  funnelType: funnelTypeEnum("funnel_type").notNull(),
  funnelDestinationUrl: text("funnel_destination_url").notNull(),
  funnelShortlinkCode: text("funnel_shortlink_code").unique(),
  contentRules: jsonb("content_rules").$type<ContentRules>().notNull(),
  automationRules: jsonb("automation_rules").$type<Record<string, unknown>[]>().notNull().default([]),
  scheduleStrategy: jsonb("schedule_strategy").$type<ScheduleStrategy>().notNull(),
  timezone: text("timezone").notNull().default("Europe/London"),
  connectedAccountIds: text("connected_account_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
