import { pgTable, text, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "creator", "pro"]);

export const creators = pgTable("creators", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password"),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  aiCreditsRemaining: integer("ai_credits_remaining").notNull().default(10),
  aiCreditsResetAt: timestamp("ai_credits_reset_at", { withTimezone: true }),
  timezone: text("timezone").notNull().default("Europe/London"),
  nicheKeywords: text("niche_keywords").array().notNull().default([]),
  competitorHandles: text("competitor_handles").array().notNull().default([]),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  gdprDataExportRequestedAt: timestamp("gdpr_data_export_requested_at", { withTimezone: true }),
  gdprDeletionRequestedAt: timestamp("gdpr_deletion_requested_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
