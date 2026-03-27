import { pgTable, text, timestamp, pgEnum, jsonb, real } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { platformEnum } from "./connected-accounts.js";

export const trendStatusEnum = pgEnum("trend_status", ["breaking", "rising", "established", "saturated"]);
export const trendSourceEnum = pgEnum("trend_source", ["x_api", "tiktok_api", "instagram_heuristic", "exploding_topics"]);

export const trendSignals = pgTable("trend_signals", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  platform: platformEnum("platform").notNull(),
  keyword: text("keyword").notNull(),
  topic: text("topic"),
  category: text("category"),
  opportunityScore: real("opportunity_score").notNull(),
  velocityScore: real("velocity_score").notNull(),
  saturationScore: real("saturation_score").notNull(),
  relevanceMethodology: text("relevance_methodology"),
  status: trendStatusEnum("status").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  estimatedExpiresAt: timestamp("estimated_expires_at", { withTimezone: true }),
  source: trendSourceEnum("source").notNull(),
  rawData: jsonb("raw_data"),
});
