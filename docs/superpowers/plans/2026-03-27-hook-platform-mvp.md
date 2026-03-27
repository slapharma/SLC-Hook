# HOOK Platform — MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the HOOK MVP — AI-powered social media automation SaaS for creators, covering auth, trend intelligence, AI content generation, campaign scheduling, and analytics.

**Architecture:** Turborepo monorepo. Next.js 15 frontend on Vercel handles UI + tRPC API routes. Node.js/Express worker on Railway handles BullMQ jobs (trend polling, post publishing, token refresh, analytics collection) and a persistent WebSocket server for real-time trend push. Both apps share a `packages/db` Drizzle ORM package pointed at Supabase PostgreSQL. Redis (Upstash) is the BullMQ broker and pub/sub channel between worker and WS server.

**Tech Stack:** pnpm 9 · Turborepo 2 · Next.js 15 · tRPC v11 · Drizzle ORM 0.36 · PostgreSQL (Supabase) · Lucia v3 · BullMQ v5 · Upstash Redis · Cloudflare R2 · Anthropic Claude API (sonnet-4-6 for generation, haiku-4-5 for moderation) · Stripe · Resend · Vitest · Playwright

---

## Repository Layout (lock this in before writing any code)

```
SLC-Hook/
├── apps/
│   ├── web/                          # Next.js 15 (Vercel)
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (auth)/signup/
│   │   │   ├── (auth)/onboarding/
│   │   │   ├── (dashboard)/          # Protected layout
│   │   │   │   ├── page.tsx          # Dashboard home
│   │   │   │   ├── trends/
│   │   │   │   ├── studio/
│   │   │   │   ├── campaigns/
│   │   │   │   ├── queue/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   ├── api/trpc/[trpc]/route.ts
│   │   │   ├── api/auth/callback/[platform]/route.ts
│   │   │   ├── api/webhooks/stripe/route.ts
│   │   │   └── api/r/[code]/route.ts  # Funnel shortlink redirect
│   │   ├── components/ui/            # shadcn/ui primitives
│   │   ├── components/trends/
│   │   ├── components/studio/
│   │   ├── components/campaigns/
│   │   ├── components/queue/
│   │   ├── components/analytics/
│   │   ├── lib/auth.ts               # Lucia instance
│   │   ├── lib/trpc.ts               # tRPC client (TanStack Query)
│   │   ├── lib/ws.ts                 # WebSocket client hook
│   │   ├── lib/stripe.ts
│   │   └── next.config.ts
│   └── worker/                       # Railway persistent process
│       └── src/
│           ├── index.ts              # Express + WS server entry
│           ├── queues/index.ts       # Queue instances
│           ├── workers/
│           │   ├── trend-polling.ts
│           │   ├── post-publisher.ts
│           │   ├── analytics-collector.ts
│           │   └── token-refresh.ts
│           ├── ws/server.ts          # WebSocket push server
│           └── crons/index.ts        # BullMQ repeatable jobs
├── packages/
│   ├── db/
│   │   ├── src/schema/
│   │   │   ├── creators.ts
│   │   │   ├── sessions.ts           # Lucia sessions table
│   │   │   ├── connected-accounts.ts
│   │   │   ├── campaigns.ts
│   │   │   ├── trends.ts
│   │   │   ├── posts.ts
│   │   │   ├── analytics.ts
│   │   │   ├── funnel.ts
│   │   │   └── index.ts
│   │   ├── src/client.ts
│   │   ├── src/index.ts
│   │   └── drizzle.config.ts
│   ├── trpc/
│   │   └── src/
│   │       ├── context.ts
│   │       ├── init.ts               # initTRPC + middleware
│   │       ├── router/
│   │       │   ├── campaigns.ts
│   │       │   ├── connected-accounts.ts
│   │       │   ├── posts.ts
│   │       │   ├── trends.ts
│   │       │   ├── analytics.ts
│   │       │   └── ai.ts
│   │       └── index.ts              # AppRouter export
│   ├── platform-adapters/
│   │   └── src/
│   │       ├── types.ts              # PlatformAdapter interface
│   │       ├── x/adapter.ts
│   │       ├── x/oauth.ts
│   │       ├── instagram/adapter.ts
│   │       ├── instagram/oauth.ts
│   │       ├── tiktok/adapter.ts     # stub — pending API approval
│   │       └── linkedin/adapter.ts   # stub — pending API approval
│   └── ai/
│       └── src/
│           ├── hooks.ts              # Hook generator (sonnet)
│           ├── post-builder.ts       # Full post + platform formatting
│           ├── moderation.ts         # Safety check (haiku)
│           ├── sentiment.ts          # Reply sentiment (haiku)
│           ├── embeddings.ts         # Niche relevance scoring
│           └── prompts/
│               ├── hook-generator.ts
│               ├── post-builder.ts
│               └── moderation.ts
├── docker-compose.yml                # Local Postgres + Redis for dev/test
├── .env.example
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Chunk 0: Monorepo Foundation

**Files:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `docker-compose.yml`, `.env.example`, `apps/web/package.json`, `apps/web/next.config.ts`, `apps/worker/package.json`, `apps/worker/tsconfig.json`, `packages/db/package.json`, `packages/trpc/package.json`, `packages/platform-adapters/package.json`, `packages/ai/package.json`

### Task 0.1: pnpm workspace root

- [ ] Create `package.json` at repo root:

```json
{
  "name": "hook-platform",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "vitest": "^2.1.0"
  },
  "engines": {
    "node": ">=22",
    "pnpm": ">=9"
  }
}
```

- [ ] Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false }
  }
}
```

- [ ] Run: `pnpm install`
- [ ] Expected: pnpm installs workspace root devDeps, no errors.

### Task 0.2: Docker Compose for local dev

- [ ] Create `docker-compose.yml`:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: hook_dev
      POSTGRES_USER: hook
      POSTGRES_PASSWORD: hook_dev_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
volumes:
  pgdata:
```

- [ ] Run: `docker compose up -d`
- [ ] Expected: Both containers start. `docker compose ps` shows `running`.

### Task 0.3: Environment variables

- [ ] Create `.env.example` (no real secrets, just keys):

```bash
# Database
DATABASE_URL=postgresql://hook:hook_dev_password@localhost:5432/hook_dev

# Redis (local dev; use Upstash URL in production)
REDIS_URL=redis://localhost:6379

# Auth
LUCIA_SECRET=change_me_32_chars_minimum_secret

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# X (Twitter) API
X_CLIENT_ID=
X_CLIENT_SECRET=
X_BEARER_TOKEN=

# Instagram / Meta
META_APP_ID=
META_APP_SECRET=

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CREATOR_PRICE_ID=
STRIPE_PRO_PRICE_ID=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=hook-media

# Resend
RESEND_API_KEY=

# Exploding Topics (LinkedIn trends)
EXPLODING_TOPICS_API_KEY=

# RapidAPI (TikTok trend data)
RAPIDAPI_KEY=

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
WORKER_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

- [ ] Copy `.env.example` to `.env.local` (apps/web) and `.env` (apps/worker) and fill in local values.

### Task 0.4: Next.js app scaffold

- [ ] Run: `pnpm create next-app apps/web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"`
- [ ] Modify `apps/web/package.json` to add workspace deps:

```json
{
  "name": "@hook/web",
  "dependencies": {
    "@hook/db": "workspace:*",
    "@hook/trpc": "workspace:*",
    "@hook/platform-adapters": "workspace:*",
    "@hook/ai": "workspace:*"
  }
}
```

- [ ] Update `apps/web/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hook/db", "@hook/trpc", "@hook/platform-adapters", "@hook/ai"],
};

export default nextConfig;
```

### Task 0.5: Worker app scaffold

- [ ] Create `apps/worker/package.json`:

```json
{
  "name": "@hook/worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@hook/db": "workspace:*",
    "@hook/platform-adapters": "workspace:*",
    "@hook/ai": "workspace:*",
    "bullmq": "^5.14.0",
    "express": "^4.21.0",
    "ws": "^8.18.0",
    "ioredis": "^5.4.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/ws": "^8.5.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] Create `apps/worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] Create `apps/worker/src/index.ts`:

```typescript
import "dotenv/config";
import express from "express";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
```

### Task 0.6: Shared package scaffolds

- [ ] Create `packages/db/package.json`:

```json
{
  "name": "@hook/db",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] Create `packages/trpc/package.json`:

```json
{
  "name": "@hook/trpc",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "dependencies": {
    "@hook/db": "workspace:*",
    "@trpc/server": "^11.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": { "typescript": "^5.7.0", "vitest": "^2.1.0" }
}
```

- [ ] Create `packages/platform-adapters/package.json`:

```json
{
  "name": "@hook/platform-adapters",
  "version": "0.1.0",
  "main": "./src/types.ts",
  "dependencies": { "zod": "^3.23.0" },
  "devDependencies": { "typescript": "^5.7.0", "vitest": "^2.1.0" }
}
```

- [ ] Create `packages/ai/package.json`:

```json
{
  "name": "@hook/ai",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "zod": "^3.23.0"
  },
  "devDependencies": { "typescript": "^5.7.0", "vitest": "^2.1.0" }
}
```

- [ ] Run from root: `pnpm install`
- [ ] Run: `pnpm dev` — web on :3000, worker on :3001 both start without errors.
- [ ] Commit:

```bash
git add .
git commit -m "feat: monorepo scaffold (Turborepo, pnpm workspaces, Next.js 15, worker)"
```

---

## Chunk 1: Database Schema & Migrations

**Files:** All files in `packages/db/src/schema/`, `packages/db/src/client.ts`, `packages/db/drizzle.config.ts`, migrations directory.

### Task 1.1: Drizzle client

- [ ] Create `packages/db/src/client.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch for Supabase Transaction pooler mode
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export type DB = typeof db;
```

### Task 1.2: Creator + Session schema

- [ ] Create `packages/db/src/schema/creators.ts`:

```typescript
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
```

- [ ] Create `packages/db/src/schema/sessions.ts` (Lucia v3 requires this table):

```typescript
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
```

### Task 1.3: ConnectedAccount schema

- [ ] Create `packages/db/src/schema/connected-accounts.ts`:

```typescript
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
  // Tokens stored AES-256-GCM encrypted — see packages/db/src/crypto.ts
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  encryptionKeyId: text("encryption_key_id").notNull(),
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
```

### Task 1.4: Campaign schema

- [ ] Create `packages/db/src/schema/campaigns.ts`:

```typescript
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
```

### Task 1.5: TrendSignal + Post schemas

- [ ] Create `packages/db/src/schema/trends.ts`:

```typescript
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
```

- [ ] Create `packages/db/src/schema/posts.ts`:

```typescript
import { pgTable, text, timestamp, pgEnum, jsonb, integer, real, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { campaigns } from "./campaigns.js";
import { connectedAccounts } from "./connected-accounts.js";
import { platformEnum } from "./connected-accounts.js";
import { trendSignals } from "./trends.js";

export const postStatusEnum = pgEnum("post_status", [
  "draft", "approved", "scheduled", "publishing", "published", "failed", "dead_letter", "paused"
]);

export const hookFrameworkEnum = pgEnum("hook_framework", [
  "curiosity_gap", "contrarian", "number_list", "personal_stakes", "bold_claim"
]);

// Parent record — one per content piece, regardless of how many accounts it posts to
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

// One per connected account per CampaignPost
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
```

- [ ] Create `packages/db/src/schema/analytics.ts`:

```typescript
import { pgTable, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { posts, campaigns, hookFrameworkEnum } from "./posts.js";
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
  source: text("source").notNull(), // "postback" | "pixel"
  convertedAt: timestamp("converted_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] Create `packages/db/src/schema/index.ts` exporting all schemas.
- [ ] Create `packages/db/drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] Run: `pnpm --filter @hook/db db:generate`
- [ ] Expected: `packages/db/drizzle/` directory created with SQL migration files.
- [ ] Run: `pnpm --filter @hook/db db:migrate`
- [ ] Expected: All tables created in local Postgres. Verify: `psql hook_dev -c "\dt"`
- [ ] Write unit test for schema type checking `packages/db/src/schema/__tests__/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { creators, sessions, connectedAccounts, campaigns, trendSignals, posts, campaignPosts } from "../index.js";

describe("schema exports", () => {
  it("exports all required tables", () => {
    expect(creators).toBeDefined();
    expect(sessions).toBeDefined();
    expect(connectedAccounts).toBeDefined();
    expect(campaigns).toBeDefined();
    expect(trendSignals).toBeDefined();
    expect(campaignPosts).toBeDefined();
    expect(posts).toBeDefined();
  });
});
```

- [ ] Run: `pnpm --filter @hook/db test`
- [ ] Expected: PASS
- [ ] Commit:

```bash
git add packages/db/
git commit -m "feat: database schema (all entities, Drizzle ORM, initial migration)"
```

---

## Chunk 2: Token Encryption

Tokens are encrypted before DB write, decrypted only in worker/adapter code. Keys live in env, never logged.

**Files:** `packages/db/src/crypto.ts`

### Task 2.1: AES-256-GCM encrypt/decrypt

- [ ] Write failing test `packages/db/src/crypto.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "./crypto.js";

describe("token encryption", () => {
  const key = "0".repeat(64); // 32 bytes hex

  it("round-trips a token", () => {
    const original = "ya29.some_oauth_token";
    const encrypted = encryptToken(original, key);
    expect(encrypted).not.toBe(original);
    expect(decryptToken(encrypted, key)).toBe(original);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const t = "same_token";
    expect(encryptToken(t, key)).not.toBe(encryptToken(t, key));
  });

  it("throws on wrong key", () => {
    const encrypted = encryptToken("token", key);
    const wrongKey = "1".repeat(64);
    expect(() => decryptToken(encrypted, wrongKey)).toThrow();
  });
});
```

- [ ] Run: `pnpm --filter @hook/db test` — FAIL (crypto.ts not yet written)
- [ ] Create `packages/db/src/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function keyBuffer(hexKey: string): Buffer {
  const buf = Buffer.from(hexKey, "hex");
  if (buf.length !== 32) throw new Error("Encryption key must be 32 bytes (64 hex chars)");
  return buf;
}

/** Returns base64 string: iv:authTag:ciphertext */
export function encryptToken(plaintext: string, hexKey: string): string {
  const key = keyBuffer(hexKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptToken(encoded: string, hexKey: string): string {
  const key = keyBuffer(hexKey);
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}
```

- [ ] Run: `pnpm --filter @hook/db test` — PASS
- [ ] Commit: `git commit -m "feat: AES-256-GCM token encryption for OAuth tokens"`

---

## Chunk 3: Authentication (Lucia v3)

**Files:** `apps/web/lib/auth.ts`, `apps/web/app/api/auth/[...]/route.ts`, `apps/web/app/(auth)/signup/`, `apps/web/app/(auth)/login/`, `apps/web/middleware.ts`

### Task 3.1: Install auth deps

- [ ] Run:
```bash
pnpm --filter @hook/web add lucia @lucia-auth/adapter-drizzle arctic
pnpm --filter @hook/web add bcryptjs
pnpm --filter @hook/web add -D @types/bcryptjs
```

(`arctic` is the OAuth library for social providers used with Lucia v3)

### Task 3.2: Lucia instance

- [ ] Create `apps/web/lib/auth.ts`:

```typescript
import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "@hook/db";
import { sessions, creators } from "@hook/db/schema";

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, creators);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes(attributes) {
    return {
      id: attributes.id,
      email: attributes.email,
      name: attributes.name,
      subscriptionTier: attributes.subscriptionTier,
      onboardingCompletedAt: attributes.onboardingCompletedAt,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      id: string;
      email: string;
      name: string;
      subscriptionTier: "free" | "creator" | "pro";
      onboardingCompletedAt: Date | null;
    };
  }
}
```

### Task 3.3: Auth middleware

- [ ] Create `apps/web/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyRequestOrigin } from "lucia";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (request.method === "GET") return NextResponse.next();

  // CSRF protection for non-GET state-changing requests
  const originHeader = request.headers.get("Origin");
  const hostHeader = request.headers.get("Host");
  if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
    return new NextResponse(null, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Task 3.4: Session helper (server-side)

- [ ] Create `apps/web/lib/session.ts`:

```typescript
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
```

### Task 3.5: Sign-up API route

- [ ] Write test `apps/web/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/password";

describe("password utilities", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toBe("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] Run: FAIL
- [ ] Create `apps/web/lib/password.ts`:

```typescript
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] Run: PASS
- [ ] Create `apps/web/app/api/auth/signup/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@hook/db";
import { creators } from "@hook/db/schema";
import { lucia } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, password, name } = parsed.data;

  const existing = await db.select().from(creators).where(eq(creators.email, email)).limit(1);
  if (existing.length > 0) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const hashedPassword = await hashPassword(password);
  const [creator] = await db.insert(creators).values({ email, hashedPassword, name }).returning();

  const session = await lucia.createSession(creator.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

  return NextResponse.json({ userId: creator.id }, { status: 201 });
}
```

- [ ] Create `apps/web/app/api/auth/login/route.ts` (similar pattern — find user, verify password, create session).
- [ ] Create `apps/web/app/api/auth/logout/route.ts` (invalidate session, clear cookie).
- [ ] Create `apps/web/app/(auth)/signup/page.tsx` — form calling `/api/auth/signup`.
- [ ] Create `apps/web/app/(auth)/login/page.tsx` — form calling `/api/auth/login`.
- [ ] Create `apps/web/app/(dashboard)/layout.tsx` — server component that calls `requireAuth()`, redirects to `/login` if unauthenticated.

### Task 3.6: Google OAuth (arctic)

- [ ] Create `apps/web/lib/google.ts`:

```typescript
import { Google } from "arctic";

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
);
```

- [ ] Create `apps/web/app/api/auth/google/route.ts` — generate OAuth URL + redirect.
- [ ] Create `apps/web/app/api/auth/callback/google/route.ts` — exchange code, upsert creator, create session.
- [ ] Commit: `git commit -m "feat: auth — email/password signup/login + Google OAuth (Lucia v3)"`

---

## Chunk 4: tRPC Setup + Tier Enforcement

**Files:** `packages/trpc/src/context.ts`, `packages/trpc/src/init.ts`, `packages/trpc/src/router/`, `apps/web/app/api/trpc/[trpc]/route.ts`

### Task 4.1: tRPC context

- [ ] Create `packages/trpc/src/context.ts`:

```typescript
import { db } from "@hook/db";
import type { DB } from "@hook/db";

export type Context = {
  db: DB;
  userId: string | null;
  userTier: "free" | "creator" | "pro" | null;
};

export function createContext(userId: string | null, userTier: "free" | "creator" | "pro" | null): Context {
  return { db, userId, userTier };
}
```

### Task 4.2: tRPC init + middleware

- [ ] Create `packages/trpc/src/init.ts`:

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId, userTier: ctx.userTier! } });
});

export const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userTier === "free") throw new TRPCError({ code: "FORBIDDEN", message: "Upgrade to Creator" });
  return next({ ctx });
});

export const proProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userTier !== "pro") throw new TRPCError({ code: "FORBIDDEN", message: "Upgrade to Pro" });
  return next({ ctx });
});
```

- [ ] Write test for middleware `packages/trpc/src/__tests__/middleware.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { createContext } from "../context.js";

describe("context factory", () => {
  it("creates context with null userId for unauthenticated", () => {
    const ctx = createContext(null, null);
    expect(ctx.userId).toBeNull();
  });

  it("creates context with userId and tier", () => {
    const ctx = createContext("user_123", "creator");
    expect(ctx.userId).toBe("user_123");
    expect(ctx.userTier).toBe("creator");
  });
});
```

- [ ] Run: PASS

### Task 4.3: tRPC Next.js adapter

- [ ] Install in web: `pnpm --filter @hook/web add @trpc/server @trpc/client @trpc/react-query @tanstack/react-query`
- [ ] Create `apps/web/app/api/trpc/[trpc]/route.ts`:

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@hook/trpc";
import { createContext } from "@hook/trpc/context";
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
```

- [ ] Create `packages/trpc/src/index.ts` exporting `appRouter` and `AppRouter` type.
- [ ] Create `apps/web/lib/trpc.ts` — TanStack Query + tRPC client setup.
- [ ] Commit: `git commit -m "feat: tRPC v11 with tier-enforcement middleware"`

---

## Chunk 5: Stripe Subscriptions

**Files:** `apps/web/lib/stripe.ts`, `apps/web/app/api/webhooks/stripe/route.ts`, tRPC billing router

### Task 5.1: Stripe client

- [ ] Install: `pnpm --filter @hook/web add stripe`
- [ ] Create `apps/web/lib/stripe.ts`:

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20",
  typescript: true,
});

export const PLANS = {
  creator: {
    priceId: process.env.STRIPE_CREATOR_PRICE_ID!,
    tier: "creator" as const,
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    tier: "pro" as const,
  },
} as const;
```

### Task 5.2: Checkout session creation

- [ ] Add to tRPC billing router `packages/trpc/src/router/billing.ts`:

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../init.js";
import { stripe, PLANS } from "@hook/web/lib/stripe"; // NOTE: import from env-aware module
import { db } from "@hook/db";
import { creators } from "@hook/db/schema";
import { eq } from "drizzle-orm";

export const billingRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({ plan: z.enum(["creator", "pro"]) }))
    .mutation(async ({ input, ctx }) => {
      const [creator] = await ctx.db.select().from(creators).where(eq(creators.id, ctx.userId));

      let customerId = creator.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: creator.email, name: creator.name });
        customerId = customer.id;
        await ctx.db.update(creators).set({ stripeCustomerId: customerId }).where(eq(creators.id, ctx.userId));
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: PLANS[input.plan].priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
        currency: "gbp",
      });

      return { url: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const [creator] = await ctx.db.select().from(creators).where(eq(creators.id, ctx.userId));
    if (!creator.stripeCustomerId) throw new Error("No billing account");
    const session = await stripe.billingPortal.sessions.create({
      customer: creator.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });
    return { url: session.url };
  }),
});
```

### Task 5.3: Stripe webhook handler

- [ ] Create `apps/web/app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@hook/db";
import { creators } from "@hook/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price.id;
    const tier = priceId === process.env.STRIPE_CREATOR_PRICE_ID ? "creator"
               : priceId === process.env.STRIPE_PRO_PRICE_ID ? "pro"
               : "free";

    await db.update(creators)
      .set({ subscriptionTier: tier, stripeSubscriptionId: sub.id })
      .where(eq(creators.stripeCustomerId, sub.customer as string));
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await db.update(creators)
      .set({ subscriptionTier: "free", stripeSubscriptionId: null })
      .where(eq(creators.stripeCustomerId, sub.customer as string));
  }

  return NextResponse.json({ received: true });
}

export const config = { api: { bodyParser: false } };
```

- [ ] Write test for tier-derivation logic:

```typescript
// packages/trpc/src/__tests__/billing.test.ts
import { describe, it, expect } from "vitest";

function tierFromPriceId(priceId: string, creatorPriceId: string, proPriceId: string) {
  if (priceId === creatorPriceId) return "creator";
  if (priceId === proPriceId) return "pro";
  return "free";
}

describe("tierFromPriceId", () => {
  it("returns creator for creator price", () => {
    expect(tierFromPriceId("price_creator", "price_creator", "price_pro")).toBe("creator");
  });
  it("returns pro for pro price", () => {
    expect(tierFromPriceId("price_pro", "price_creator", "price_pro")).toBe("pro");
  });
  it("defaults to free for unknown price", () => {
    expect(tierFromPriceId("price_unknown", "price_creator", "price_pro")).toBe("free");
  });
});
```

- [ ] Run test: PASS
- [ ] Commit: `git commit -m "feat: Stripe subscriptions — checkout, portal, webhook tier sync"`

---

## Chunk 6: Platform Adapters + Connected Accounts

**Files:** `packages/platform-adapters/src/`, tRPC `connected-accounts` router, OAuth callback routes

### Task 6.1: PlatformAdapter interface

- [ ] Write test for interface shape:

```typescript
// packages/platform-adapters/src/__tests__/adapter.test.ts
import { describe, it, expect } from "vitest";
import type { PlatformAdapter, PublishResult } from "../types.js";

// Compile-time test: a stub must satisfy the interface
const stubAdapter: PlatformAdapter = {
  platform: "x",
  publishPost: async (_account, _post): Promise<PublishResult> => ({
    success: true,
    platformPostId: "stub_id",
  }),
  fetchAnalytics: async (_account, _postId) => ({
    impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, linkClicks: 0, followerDelta: 0,
  }),
  refreshToken: async (account) => account,
  revokeToken: async () => {},
};

describe("PlatformAdapter interface", () => {
  it("stub satisfies interface (type check)", () => {
    expect(stubAdapter.platform).toBe("x");
  });

  it("publishPost returns PublishResult shape", async () => {
    const result = await stubAdapter.publishPost({} as any, {} as any);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("platformPostId");
  });
});
```

- [ ] Run: FAIL
- [ ] Create `packages/platform-adapters/src/types.ts`:

```typescript
import type { connectedAccounts } from "@hook/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type ConnectedAccountRow = InferSelectModel<typeof connectedAccounts>;

export type PostPayload = {
  platform: "x" | "tiktok" | "instagram" | "linkedin";
  contentBodyFormatted: string;
  mediaR2Urls?: string[];
  mediaAltTexts?: string[];
  scheduledFor?: Date;
};

export type PublishResult =
  | { success: true; platformPostId: string }
  | { success: false; error: string; retryable: boolean };

export type AnalyticsResult = {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  linkClicks: number;
  followerDelta: number;
};

export interface PlatformAdapter {
  platform: "x" | "tiktok" | "instagram" | "linkedin";
  publishPost(account: ConnectedAccountRow, post: PostPayload): Promise<PublishResult>;
  fetchAnalytics(account: ConnectedAccountRow, platformPostId: string): Promise<AnalyticsResult>;
  refreshToken(account: ConnectedAccountRow): Promise<ConnectedAccountRow>;
  revokeToken(account: ConnectedAccountRow): Promise<void>;
}
```

- [ ] Run: PASS

### Task 6.2: X (Twitter) adapter

- [ ] Install: `pnpm --filter @hook/platform-adapters add twitter-api-v2`
- [ ] Create `packages/platform-adapters/src/x/adapter.ts`:

```typescript
import { TwitterApi } from "twitter-api-v2";
import type { PlatformAdapter, ConnectedAccountRow, PostPayload, PublishResult, AnalyticsResult } from "../types.js";
import { decryptToken } from "@hook/db/crypto";

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!;

export const xAdapter: PlatformAdapter = {
  platform: "x",

  async publishPost(account, post): Promise<PublishResult> {
    try {
      const accessToken = decryptToken(account.encryptedAccessToken, ENCRYPTION_KEY);
      const client = new TwitterApi(accessToken);

      const text = post.contentBodyFormatted;

      // X threads: split on "\n---\n" delimiter added by post-builder
      const parts = text.split("\n---\n").filter(Boolean);

      if (parts.length === 1) {
        const tweet = await client.v2.tweet(parts[0]);
        return { success: true, platformPostId: tweet.data.id };
      }

      // Thread: post first tweet, then reply chain
      let replyToId: string | undefined;
      let firstId: string | undefined;
      for (const part of parts) {
        const tweet = await client.v2.tweet(part, replyToId ? { reply: { in_reply_to_tweet_id: replyToId } } : undefined);
        replyToId = tweet.data.id;
        if (!firstId) firstId = tweet.data.id;
      }
      return { success: true, platformPostId: firstId! };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = msg.includes("rate limit") || msg.includes("503");
      return { success: false, error: msg, retryable };
    }
  },

  async fetchAnalytics(account, platformPostId): Promise<AnalyticsResult> {
    const accessToken = decryptToken(account.encryptedAccessToken, ENCRYPTION_KEY);
    const client = new TwitterApi(accessToken);
    const tweet = await client.v2.singleTweet(platformPostId, {
      "tweet.fields": ["public_metrics"],
    });
    const m = tweet.data.public_metrics ?? {};
    return {
      impressions: m.impression_count ?? 0,
      reach: m.impression_count ?? 0,
      likes: m.like_count ?? 0,
      comments: m.reply_count ?? 0,
      shares: m.retweet_count ?? 0,
      saves: m.bookmark_count ?? 0,
      linkClicks: m.url_link_clicks ?? 0,
      followerDelta: 0, // Requires separate user metrics call
    };
  },

  async refreshToken(account) {
    // X OAuth 2.0 PKCE tokens don't expire if user doesn't revoke
    // App-only tokens rotate via X API dashboard
    return account;
  },

  async revokeToken(account) {
    const accessToken = decryptToken(account.encryptedAccessToken, ENCRYPTION_KEY);
    const client = new TwitterApi(accessToken);
    await client.v2.revokeOAuth2Token(accessToken, "access_token");
  },
};
```

### Task 6.3: Instagram adapter

- [ ] Create `packages/platform-adapters/src/instagram/adapter.ts`:

```typescript
import type { PlatformAdapter, ConnectedAccountRow, PostPayload, PublishResult, AnalyticsResult } from "../types.js";
import { decryptToken } from "@hook/db/crypto";

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!;
const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function graphFetch(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export const instagramAdapter: PlatformAdapter = {
  platform: "instagram",

  async publishPost(account, post): Promise<PublishResult> {
    try {
      const token = decryptToken(account.encryptedAccessToken, ENCRYPTION_KEY);
      const igUserId = account.platformAccountId;

      // Step 1: Create media container
      const containerParams: Record<string, string> = {
        caption: post.contentBodyFormatted,
        access_token: token,
      };

      if (post.mediaR2Urls && post.mediaR2Urls.length > 0) {
        containerParams.image_url = post.mediaR2Urls[0]; // R2 public URL
        containerParams.media_type = "IMAGE";
      } else {
        // Text-only via Instagram — not supported on feed; use as Reel caption placeholder
        containerParams.media_type = "REELS";
        containerParams.share_to_feed = "true";
      }

      const container = await graphFetch(`${igUserId}/media`, containerParams);

      // Step 2: Publish
      const result = await graphFetch(`${igUserId}/media_publish`, {
        creation_id: container.id,
        access_token: token,
      });

      return { success: true, platformPostId: result.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg, retryable: msg.includes("rate") };
    }
  },

  async fetchAnalytics(account, platformPostId): Promise<AnalyticsResult> {
    const token = decryptToken(account.encryptedAccessToken, ENCRYPTION_KEY);
    const data = await graphFetch(`${platformPostId}/insights`, {
      metric: "impressions,reach,likes,comments,shares,saved",
      access_token: token,
    });
    const metrics: Record<string, number> = {};
    for (const item of data.data) metrics[item.name] = item.values?.[0]?.value ?? 0;
    return {
      impressions: metrics.impressions ?? 0,
      reach: metrics.reach ?? 0,
      likes: metrics.likes ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      saves: metrics.saved ?? 0,
      linkClicks: 0,
      followerDelta: 0,
    };
  },

  async refreshToken(account) { return account; }, // Long-lived tokens (60 days) — refresh handled separately
  async revokeToken() {},
};
```

### Task 6.4: Stub adapters for TikTok + LinkedIn

- [ ] Create `packages/platform-adapters/src/tiktok/adapter.ts`:

```typescript
import type { PlatformAdapter } from "../types.js";

export const tiktokAdapter: PlatformAdapter = {
  platform: "tiktok",
  async publishPost() { throw new Error("TikTok API integration pending approval"); },
  async fetchAnalytics() { throw new Error("TikTok API integration pending approval"); },
  async refreshToken(account) { return account; },
  async revokeToken() {},
};
```

- [ ] Create `packages/platform-adapters/src/linkedin/adapter.ts` (same stub pattern).

### Task 6.5: Connected accounts tRPC router

- [ ] Create `packages/trpc/src/router/connected-accounts.ts`:

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../init.js";
import { connectedAccounts } from "@hook/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const TIER_ACCOUNT_LIMITS = { free: 1, creator: 3, pro: Infinity } as const;

export const connectedAccountsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select({
      id: connectedAccounts.id,
      platform: connectedAccounts.platform,
      handle: connectedAccounts.handle,
      displayName: connectedAccounts.displayName,
      avatarUrl: connectedAccounts.avatarUrl,
      authStatus: connectedAccounts.authStatus,
      connectedAt: connectedAccounts.connectedAt,
    }).from(connectedAccounts).where(eq(connectedAccounts.creatorId, ctx.userId));
  }),

  disconnect: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(connectedAccounts)
        .where(and(eq(connectedAccounts.id, input.accountId), eq(connectedAccounts.creatorId, ctx.userId)));
    }),

  checkTierLimit: protectedProcedure
    .input(z.object({ platform: z.enum(["x", "tiktok", "instagram", "linkedin"]) }))
    .query(async ({ input, ctx }) => {
      const existing = await ctx.db.select().from(connectedAccounts)
        .where(and(eq(connectedAccounts.creatorId, ctx.userId), eq(connectedAccounts.platform, input.platform)));
      const limit = TIER_ACCOUNT_LIMITS[ctx.userTier ?? "free"];
      return { canAdd: existing.length < limit, current: existing.length, limit };
    }),
});
```

- [ ] Create OAuth callback routes in `apps/web/app/api/auth/callback/[platform]/route.ts` — handle code exchange, encrypt tokens, insert/update `connectedAccounts`.
- [ ] Commit: `git commit -m "feat: platform adapters (X, Instagram) + connected accounts CRUD"`

---

## Chunk 7: Trend Engine

**Files:** `apps/worker/src/workers/trend-polling.ts`, `apps/worker/src/ws/server.ts`, `apps/worker/src/crons/index.ts`, tRPC trends router

### Task 7.1: Redis client (shared)

- [ ] Install: `pnpm --filter @hook/worker add ioredis`
- [ ] Create `apps/worker/src/redis.ts`:

```typescript
import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
export const redisPub = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
export const redisSub = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
```

### Task 7.2: Opportunity score calculation

- [ ] Write failing test `apps/worker/src/__tests__/trend-score.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateOpportunityScore } from "../workers/trend-polling.js";

describe("calculateOpportunityScore", () => {
  it("weights velocity 40%, relevance 35%, saturation inverse 25%", () => {
    const score = calculateOpportunityScore({ velocity: 100, relevance: 100, saturation: 0 });
    expect(score).toBe(100);
  });

  it("saturated trend scores low", () => {
    const score = calculateOpportunityScore({ velocity: 80, relevance: 80, saturation: 100 });
    expect(score).toBeCloseTo(80 * 0.4 + 80 * 0.35 + 0 * 0.25, 1);
  });

  it("clamps to 0–100", () => {
    expect(calculateOpportunityScore({ velocity: 0, relevance: 0, saturation: 100 })).toBe(0);
    expect(calculateOpportunityScore({ velocity: 100, relevance: 100, saturation: 0 })).toBe(100);
  });
});
```

- [ ] Run: FAIL
- [ ] Create `apps/worker/src/workers/trend-polling.ts` with `calculateOpportunityScore`:

```typescript
export function calculateOpportunityScore({
  velocity,
  relevance,
  saturation,
}: {
  velocity: number;
  relevance: number;
  saturation: number;
}): number {
  const raw = velocity * 0.4 + relevance * 0.35 + (1 - saturation / 100) * 100 * 0.25;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}
```

- [ ] Run: PASS

### Task 7.3: X trend polling worker

- [ ] Extend `apps/worker/src/workers/trend-polling.ts` with `pollXTrends`:

```typescript
import { TwitterApi } from "twitter-api-v2";
import { db } from "@hook/db";
import { trendSignals } from "@hook/db/schema";
import { redisPub } from "../redis.js";

const WOEID_WORLDWIDE = 1;

export async function pollXTrends() {
  const client = new TwitterApi(process.env.X_BEARER_TOKEN!);

  // X API v2 trending topics (requires Elevated access)
  // Falls back to search/recent volume heuristic on Basic tier
  let trends: Array<{ keyword: string; velocity: number }> = [];

  try {
    // Trending topics endpoint (X API v2, available on Pro/Enterprise)
    const response = await client.v1.trendingPlaces(WOEID_WORLDWIDE);
    trends = response[0]?.trends?.map((t) => ({
      keyword: t.name,
      velocity: t.tweet_volume ? Math.min(100, Math.log10(t.tweet_volume) * 20) : 50,
    })) ?? [];
  } catch {
    // Basic tier fallback: skip trend polling, will implement search-volume heuristic in Phase 2
    console.warn("X trending topics unavailable on current API tier — skipping");
    return;
  }

  for (const trend of trends.slice(0, 20)) {
    const opportunityScore = calculateOpportunityScore({
      velocity: trend.velocity,
      relevance: 50, // Global relevance — per-creator relevance computed at query time
      saturation: 30, // Default; will be improved with volume history
    });

    const status = trend.velocity > 80 ? "breaking" : trend.velocity > 50 ? "rising" : "established";

    await db.insert(trendSignals).values({
      platform: "x",
      keyword: trend.keyword,
      opportunityScore,
      velocityScore: trend.velocity,
      saturationScore: 30,
      status,
      source: "x_api",
      estimatedExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      rawData: { tweetVolume: trend.velocity },
    }).onConflictDoNothing();

    if (status === "breaking" || status === "rising") {
      await redisPub.publish("trends:new", JSON.stringify({ platform: "x", keyword: trend.keyword, status, opportunityScore }));
    }
  }
}
```

### Task 7.4: BullMQ queue + cron job

- [ ] Create `apps/worker/src/queues/index.ts`:

```typescript
import { Queue } from "bullmq";
import { redis } from "../redis.js";

export const trendPollingQueue = new Queue("trend-polling", { connection: redis });
export const postPublisherQueue = new Queue("post-publisher", { connection: redis });
export const analyticsQueue = new Queue("analytics-collector", { connection: redis });
export const tokenRefreshQueue = new Queue("token-refresh", { connection: redis });
```

- [ ] Create `apps/worker/src/crons/index.ts`:

```typescript
import { trendPollingQueue, tokenRefreshQueue } from "../queues/index.js";

export async function registerCrons() {
  // Poll X trends every 15 minutes
  await trendPollingQueue.add("poll-x", { platform: "x" }, {
    repeat: { pattern: "*/15 * * * *" },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  // Refresh tokens every 30 minutes
  await tokenRefreshQueue.add("refresh-all", {}, {
    repeat: { pattern: "*/30 * * * *" },
    removeOnComplete: 5,
  });
}
```

### Task 7.5: WebSocket push server

- [ ] Create `apps/worker/src/ws/server.ts`:

```typescript
import { WebSocketServer, WebSocket } from "ws";
import { redisSub } from "../redis.js";

export function startWebSocketServer(port: number) {
  const wss = new WebSocketServer({ port });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  redisSub.subscribe("trends:new", (err) => {
    if (err) console.error("Redis subscribe error", err);
  });

  redisSub.on("message", (_channel, message) => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  console.log(`WebSocket server running on ws://localhost:${port}`);
  return wss;
}
```

- [ ] Update `apps/worker/src/index.ts` to call `registerCrons()` and `startWebSocketServer(3002)`.
- [ ] Commit: `git commit -m "feat: trend engine — BullMQ cron, X trend polling, Redis pub/sub, WS server"`

---

## Chunk 8: Content Studio (Claude AI)

**Files:** `packages/ai/src/hooks.ts`, `packages/ai/src/post-builder.ts`, `packages/ai/src/moderation.ts`, tRPC `ai` router

### Task 8.1: Hook generator

- [ ] Write failing test `packages/ai/src/__tests__/hooks.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { generateHooks } from "../hooks.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify({
          hooks: [
            { framework: "curiosity_gap", text: "Nobody talks about why 90% of creators fail at 1k followers..." },
            { framework: "contrarian", text: "Posting every day is actually hurting your growth." },
            { framework: "number_list", text: "7 signs your content strategy is already dead" },
            { framework: "personal_stakes", text: "I lost 3,000 followers in a week. Here's what I learned." },
            { framework: "bold_claim", text: "The algorithm doesn't reward consistency. It rewards this." },
          ]
        }) }]
      })
    };
  }
}));

describe("generateHooks", () => {
  it("returns 5 hooks with framework labels", async () => {
    const result = await generateHooks({
      trendKeyword: "creator burnout",
      platform: "x",
      niche: ["content creation", "personal branding"],
      tone: "educational",
    });
    expect(result).toHaveLength(5);
    expect(result[0]).toHaveProperty("framework");
    expect(result[0]).toHaveProperty("text");
  });
});
```

- [ ] Run: FAIL
- [ ] Create `packages/ai/src/hooks.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const HookSchema = z.object({
  hooks: z.array(z.object({
    framework: z.enum(["curiosity_gap", "contrarian", "number_list", "personal_stakes", "bold_claim"]),
    text: z.string(),
  })).length(5),
});

export type Hook = z.infer<typeof HookSchema>["hooks"][number];

export async function generateHooks(params: {
  trendKeyword: string;
  platform: "x" | "tiktok" | "instagram" | "linkedin";
  niche: string[];
  tone: "educational" | "entertaining" | "motivational" | "controversial";
  hookPerformanceContext?: string;
}): Promise<Hook[]> {
  const systemPrompt = `You are HOOK — an AI content strategist for creators. Generate viral social media hooks.
Output ONLY valid JSON matching: {"hooks": [{framework, text}, ...]} — no other text.
Niche: ${params.niche.join(", ")}
Platform: ${params.platform}
Tone: ${params.tone}
${params.hookPerformanceContext ? `This creator's best-performing framework: ${params.hookPerformanceContext}` : ""}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Generate 5 hooks about: "${params.trendKeyword}"
Use exactly these frameworks in order:
1. curiosity_gap — hint at surprising information without revealing it
2. contrarian — challenge a common belief in this niche
3. number_list — specific number + intriguing promise
4. personal_stakes — first-person story with vulnerability
5. bold_claim — definitive statement that invites engagement`,
    }],
    system: systemPrompt,
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = HookSchema.parse(JSON.parse(text));
  return parsed.hooks;
}
```

- [ ] Run: PASS

### Task 8.2: Post builder

- [ ] Create `packages/ai/src/post-builder.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  x: "Format as a Twitter thread. Each tweet max 280 chars. Separate tweets with \\n---\\n. Use hashtags sparingly (max 2). End with a question or CTA.",
  tiktok: "Format as a TikTok video script: [HOOK LINE] / [POINT 1] / [POINT 2] / [POINT 3] / [CTA]. This is text only — the creator films it.",
  instagram: "Format as an Instagram caption. Strong opening 2 lines (visible before 'more'). 3-5 paragraphs. 5-10 relevant hashtags at end. Line breaks for readability.",
  linkedin: "Format as a LinkedIn post. Professional but conversational. No hashtag stuffing (max 3). End with a question to drive comments. 150-300 words.",
};

export async function buildPost(params: {
  hookText: string;
  trendKeyword: string;
  platform: "x" | "tiktok" | "instagram" | "linkedin";
  niche: string[];
  tone: string;
  funnelCta: string;
  brandVoiceKeywords: string[];
}): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are HOOK. Write high-performing social media content.
Brand voice: ${params.brandVoiceKeywords.join(", ")}
${PLATFORM_INSTRUCTIONS[params.platform]}`,
    messages: [{
      role: "user",
      content: `Write a complete ${params.platform} post using this hook: "${params.hookText}"
Topic: ${params.trendKeyword}
Tone: ${params.tone}
End with this CTA: ${params.funnelCta}
Output ONLY the post content, no preamble.`,
    }],
  });

  return message.content[0]?.type === "text" ? message.content[0].text : "";
}
```

### Task 8.3: Content moderation

- [ ] Write test `packages/ai/src/__tests__/moderation.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { moderateContent } from "../moderation.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify({ safe: true, flags: [] }) }]
      })
    };
  }
}));

describe("moderateContent", () => {
  it("returns safe:true for clean content", async () => {
    const result = await moderateContent("Here are 5 tips for growing your audience...");
    expect(result.safe).toBe(true);
    expect(result.flags).toHaveLength(0);
  });
});
```

- [ ] Run: FAIL
- [ ] Create `packages/ai/src/moderation.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const ModerationSchema = z.object({
  safe: z.boolean(),
  flags: z.array(z.string()),
});

export async function moderateContent(content: string): Promise<{ safe: boolean; flags: string[] }> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: `You are a content safety reviewer for a social media platform.
Check for: hate speech, sexual content, guaranteed financial return claims, doxxing, spam patterns, platform TOS violations.
Output ONLY valid JSON: {"safe": true/false, "flags": ["flag1", ...]}`,
    messages: [{ role: "user", content: `Review this content:\n\n${content}` }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : '{"safe":true,"flags":[]}';
  return ModerationSchema.parse(JSON.parse(text));
}
```

- [ ] Run: PASS

### Task 8.4: AI tRPC router + credits enforcement

- [ ] Create `packages/trpc/src/router/ai.ts`:

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../init.js";
import { generateHooks, buildPost, moderateContent } from "@hook/ai";
import { creators } from "@hook/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const aiRouter = router({
  generateHooks: protectedProcedure
    .input(z.object({
      trendKeyword: z.string(),
      platform: z.enum(["x", "tiktok", "instagram", "linkedin"]),
      campaignId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check credits
      const [creator] = await ctx.db.select().from(creators).where(eq(creators.id, ctx.userId));
      if (ctx.userTier === "free" && creator.aiCreditsRemaining <= 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No AI credits remaining. Upgrade to continue." });
      }

      const hooks = await generateHooks({
        trendKeyword: input.trendKeyword,
        platform: input.platform,
        niche: creator.nicheKeywords,
        tone: "educational",
      });

      // Deduct credit (free tier only)
      if (ctx.userTier === "free") {
        await ctx.db.update(creators)
          .set({ aiCreditsRemaining: creator.aiCreditsRemaining - 1 })
          .where(eq(creators.id, ctx.userId));
      }

      return hooks;
    }),

  buildPost: protectedProcedure
    .input(z.object({
      hookText: z.string(),
      trendKeyword: z.string(),
      platform: z.enum(["x", "tiktok", "instagram", "linkedin"]),
      campaignId: z.string(),
      funnelCta: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [creator] = await ctx.db.select().from(creators).where(eq(creators.id, ctx.userId));
      const content = await buildPost({
        hookText: input.hookText,
        trendKeyword: input.trendKeyword,
        platform: input.platform,
        niche: creator.nicheKeywords,
        tone: "educational",
        funnelCta: input.funnelCta,
        brandVoiceKeywords: [],
      });

      const moderation = await moderateContent(content);

      return { content, moderation };
    }),
});
```

- [ ] Commit: `git commit -m "feat: content studio — hook generator, post builder, moderation (Claude API)"`

---

## Chunk 9: Campaign Scheduler + Post Publisher

**Files:** `packages/trpc/src/router/campaigns.ts`, `apps/worker/src/workers/post-publisher.ts`, `apps/worker/src/workers/token-refresh.ts`

### Task 9.1: Campaigns tRPC router

- [ ] Write test for active campaign limit enforcement:

```typescript
// packages/trpc/src/__tests__/campaigns.test.ts
import { describe, it, expect } from "vitest";

const ACTIVE_LIMITS = { free: 1, creator: 5, pro: Infinity } as const;

function canActivate(tier: keyof typeof ACTIVE_LIMITS, currentActive: number): boolean {
  return currentActive < ACTIVE_LIMITS[tier];
}

describe("campaign activation limits", () => {
  it("free tier allows 1 active campaign", () => {
    expect(canActivate("free", 0)).toBe(true);
    expect(canActivate("free", 1)).toBe(false);
  });
  it("creator tier allows 5", () => {
    expect(canActivate("creator", 4)).toBe(true);
    expect(canActivate("creator", 5)).toBe(false);
  });
  it("pro tier unlimited", () => {
    expect(canActivate("pro", 1000)).toBe(true);
  });
});
```

- [ ] Run: FAIL (file doesn't exist yet, import the function)
- [ ] Create `packages/trpc/src/router/campaigns.ts` with full CRUD + activation limit check.
- [ ] Run: PASS

### Task 9.2: Post publisher worker

- [ ] Create `apps/worker/src/workers/post-publisher.ts`:

```typescript
import { Worker } from "bullmq";
import { redis } from "../redis.js";
import { db } from "@hook/db";
import { posts, connectedAccounts, creators } from "@hook/db/schema";
import { eq, and } from "drizzle-orm";
import { xAdapter } from "@hook/platform-adapters/x/adapter";
import { instagramAdapter } from "@hook/platform-adapters/instagram/adapter";
import type { PlatformAdapter } from "@hook/platform-adapters";

const ADAPTERS: Record<string, PlatformAdapter> = {
  x: xAdapter,
  instagram: instagramAdapter,
};

const RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

export const postPublisherWorker = new Worker(
  "post-publisher",
  async (job) => {
    const { postId } = job.data as { postId: string };

    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post || post.status !== "scheduled") return;

    const [account] = await db.select().from(connectedAccounts)
      .where(eq(connectedAccounts.id, post.connectedAccountId));

    if (account.authStatus !== "active") {
      await db.update(posts).set({ status: "paused" }).where(eq(posts.id, postId));
      return;
    }

    await db.update(posts).set({
      status: "publishing",
      publishAttempts: post.publishAttempts + 1,
      lastAttemptAt: new Date(),
    }).where(eq(posts.id, postId));

    const adapter = ADAPTERS[post.platform];
    if (!adapter) throw new Error(`No adapter for platform: ${post.platform}`);

    const result = await adapter.publishPost(account, {
      platform: post.platform,
      contentBodyFormatted: post.contentBodyFormatted,
    });

    if (result.success) {
      await db.update(posts).set({
        status: "published",
        publishedAt: new Date(),
        publishedPlatformId: result.platformPostId,
      }).where(eq(posts.id, postId));
    } else {
      const attempts = post.publishAttempts + 1;
      if (attempts >= 4) {
        await db.update(posts).set({
          status: "dead_letter",
          lastError: result.error,
        }).where(eq(posts.id, postId));
        // TODO: notify creator via Resend email
      } else {
        const delayMs = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS.at(-1)!;
        await db.update(posts).set({
          status: "scheduled",
          lastError: result.error,
        }).where(eq(posts.id, postId));
        // Re-queue with delay
        const { postPublisherQueue } = await import("../queues/index.js");
        await postPublisherQueue.add("publish", { postId }, { delay: delayMs });
      }
    }
  },
  { connection: redis, concurrency: 10 }
);
```

### Task 9.3: Token refresh worker

- [ ] Create `apps/worker/src/workers/token-refresh.ts`:

```typescript
import { Worker } from "bullmq";
import { redis } from "../redis.js";
import { db } from "@hook/db";
import { connectedAccounts } from "@hook/db/schema";
import { lt, eq, and } from "drizzle-orm";
import { xAdapter } from "@hook/platform-adapters/x/adapter";
import { instagramAdapter } from "@hook/platform-adapters/instagram/adapter";

const ADAPTERS = { x: xAdapter, instagram: instagramAdapter } as const;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export const tokenRefreshWorker = new Worker(
  "token-refresh",
  async () => {
    const expiresThreshold = new Date(Date.now() + TWO_HOURS_MS);

    const expiring = await db.select().from(connectedAccounts)
      .where(and(
        lt(connectedAccounts.tokenExpiresAt, expiresThreshold),
        eq(connectedAccounts.authStatus, "active")
      ));

    for (const account of expiring) {
      try {
        const adapter = ADAPTERS[account.platform as keyof typeof ADAPTERS];
        if (!adapter) continue;
        const refreshed = await adapter.refreshToken(account);
        await db.update(connectedAccounts)
          .set({
            encryptedAccessToken: refreshed.encryptedAccessToken,
            tokenExpiresAt: refreshed.tokenExpiresAt,
          })
          .where(eq(connectedAccounts.id, account.id));
      } catch {
        await db.update(connectedAccounts)
          .set({ authStatus: "requires_reauth" })
          .where(eq(connectedAccounts.id, account.id));
        // TODO: notify creator
      }
    }
  },
  { connection: redis }
);
```

- [ ] Commit: `git commit -m "feat: post publisher worker (retry logic, dead letter) + token refresh cron"`

---

## Chunk 10: Analytics Engine

**Files:** `apps/worker/src/workers/analytics-collector.ts`, `apps/web/app/api/r/[code]/route.ts`, tRPC `analytics` router

### Task 10.1: Funnel shortlink redirect

- [ ] Write test for shortlink code generation:

```typescript
// packages/db/src/__tests__/shortlink.test.ts
import { describe, it, expect } from "vitest";
import { generateShortlinkCode } from "../shortlink.js";

describe("generateShortlinkCode", () => {
  it("generates an 8-char alphanumeric code", () => {
    const code = generateShortlinkCode();
    expect(code).toMatch(/^[a-z0-9]{8}$/);
  });
  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, generateShortlinkCode));
    expect(codes.size).toBe(100);
  });
});
```

- [ ] Run: FAIL
- [ ] Create `packages/db/src/shortlink.ts`:

```typescript
import { randomBytes } from "crypto";

export function generateShortlinkCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8).toLowerCase();
}
```

- [ ] Run: PASS
- [ ] Create `apps/web/app/api/r/[code]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@hook/db";
import { campaigns, funnelClicks } from "@hook/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;

  const [campaign] = await db.select().from(campaigns)
    .where(eq(campaigns.funnelShortlinkCode, code));

  if (!campaign) return NextResponse.redirect("/");

  // Record click (fire and forget)
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const anonymousUserHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);

  db.insert(funnelClicks).values({
    campaignId: campaign.id,
    shortlinkCode: code,
    anonymousUserHash,
  }).catch(() => {}); // Non-blocking

  return NextResponse.redirect(campaign.funnelDestinationUrl);
}
```

### Task 10.2: Analytics collector worker

- [ ] Create `apps/worker/src/workers/analytics-collector.ts`:

```typescript
import { Worker } from "bullmq";
import { redis } from "../redis.js";
import { db } from "@hook/db";
import { posts, postAnalytics } from "@hook/db/schema";
import { eq } from "drizzle-orm";
import { xAdapter } from "@hook/platform-adapters/x/adapter";
import { instagramAdapter } from "@hook/platform-adapters/instagram/adapter";

const ADAPTERS = { x: xAdapter, instagram: instagramAdapter } as const;

export const analyticsCollectorWorker = new Worker(
  "analytics-collector",
  async (job) => {
    const { postId } = job.data as { postId: string };

    const [post] = await db.select({
      id: posts.id,
      platform: posts.platform,
      publishedPlatformId: posts.publishedPlatformId,
      connectedAccountId: posts.connectedAccountId,
    }).from(posts).where(eq(posts.id, postId));

    if (!post?.publishedPlatformId) return;

    const { connectedAccounts } = await import("@hook/db/schema");
    const [account] = await db.select().from(connectedAccounts)
      .where(eq(connectedAccounts.id, post.connectedAccountId));

    const adapter = ADAPTERS[post.platform as keyof typeof ADAPTERS];
    if (!adapter) return;

    const analytics = await adapter.fetchAnalytics(account, post.publishedPlatformId);
    const engagementRate = analytics.impressions > 0
      ? ((analytics.likes + analytics.comments + analytics.shares) / analytics.impressions) * 100
      : 0;

    await db.insert(postAnalytics).values({
      postId: post.id,
      ...analytics,
      engagementRate: Math.round(engagementRate * 100) / 100,
    });
  },
  { connection: redis }
);
```

### Task 10.3: Analytics tRPC router

- [ ] Create `packages/trpc/src/router/analytics.ts` with:
  - `campaignSummary` — aggregate metrics per campaign
  - `postList` — posts with latest analytics per campaign
  - `hookFrameworkPerformance` — avg engagement by framework

- [ ] Commit: `git commit -m "feat: analytics engine — collector worker, funnel shortlink, tRPC analytics router"`

---

## Chunk 11: Onboarding + Frontend

**Files:** All `apps/web/app/(dashboard)/` pages, `apps/web/app/(auth)/onboarding/`, `apps/web/components/`

### Task 11.1: Install shadcn/ui + UI dependencies

```bash
pnpm --filter @hook/web dlx shadcn@latest init
pnpm --filter @hook/web add framer-motion @dnd-kit/core @dnd-kit/sortable recharts
```

Select: TypeScript, App Router, default aliases.
Add components as needed: `button`, `card`, `input`, `label`, `badge`, `dialog`, `sheet`, `tabs`, `progress`, `skeleton`

### Task 11.2: Design tokens (Tailwind config)

- [ ] Update `apps/web/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#080810",
        surface: "#0F0F1A",
        "surface-raised": "#161625",
        primary: { DEFAULT: "#7C3AED", foreground: "#F8FAFC" },
        secondary: { DEFAULT: "#06B6D4", foreground: "#080810" },
        danger: "#F43F5E",
        gold: "#F59E0B",
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
} satisfies Config;
```

### Task 11.3: Onboarding flow (5 steps)

Create `apps/web/app/(auth)/onboarding/page.tsx` — client component with step state machine:

- **Step 1:** Name + email confirm (already have from signup)
- **Step 2:** Niche keywords (3–5 tag input) + competitor handles
- **Step 3:** Monetisation model selection (email capture / direct sale / affiliate / sponsorship)
- **Step 4:** Connect first platform (X recommended) — OAuth button
- **Step 5:** Create first campaign — name, funnel URL, schedule strategy
- After step 5: trigger first hook generation → redirect to `/studio` with hooks preloaded ("first hook moment")

### Task 11.4: Dashboard home

- [ ] Create `apps/web/app/(dashboard)/page.tsx` — server component:
  - Calls `trpc.trends.recentBreaking` (top 3 breaking trends)
  - Calls `trpc.campaigns.activeList`
  - Renders TrendFeed, CampaignSummaryCards, QuickStats

### Task 11.5: Trend feed page

- [ ] Create `apps/web/app/(dashboard)/trends/page.tsx`:
  - Server component fetches initial trends
  - Client component `<TrendFeed />` subscribes to WebSocket for real-time updates
  - Free tier: shows blurred `<BreakingTrendTeaser />` with upgrade modal

### Task 11.6: Content Studio page

- [ ] Create `apps/web/app/(dashboard)/studio/page.tsx`:
  - Trend selector → hook generator (calls `trpc.ai.generateHooks`)
  - Hook card picker (5 cards, one per framework)
  - Post builder (calls `trpc.ai.buildPost`)
  - Platform preview (rendered inline)
  - Moderation warning banner if `moderation.safe === false`
  - Save to draft / Schedule buttons

### Task 11.7: Campaign manager

- [ ] Create `apps/web/app/(dashboard)/campaigns/page.tsx` — campaign list with status badges
- [ ] Create `apps/web/app/(dashboard)/campaigns/new/page.tsx` — campaign creation form
- [ ] Create `apps/web/app/(dashboard)/campaigns/[id]/page.tsx` — campaign detail with post queue

### Task 11.8: Post queue (drag-and-drop calendar)

- [ ] Create `apps/web/components/queue/DraggableQueue.tsx` using `@dnd-kit` — weekly calendar view, filter by platform/account/campaign

### Task 11.9: Analytics dashboard

- [ ] Create `apps/web/app/(dashboard)/analytics/page.tsx`:
  - Recharts LineChart for follower growth + engagement rate over time
  - HookFrameworkBar chart (horizontal bar per framework, colored by performance)
  - FunnelMetricsCard (clicks, reported conversions)

### Task 11.10: Settings page

- [ ] Create `apps/web/app/(dashboard)/settings/page.tsx`:
  - Connected accounts section (add/remove per platform, tier limit warnings)
  - Subscription section (current tier, upgrade CTA, Stripe portal link)
  - GDPR section (export data button, delete account button)

### Task 11.11: Upgrade trigger modals

Create `apps/web/components/upgrade/UpgradeModal.tsx` — reusable modal with tier comparison table.
Trigger points (add to respective components):
1. Connect second account per platform → `checkTierLimit` → show modal
2. Activate second campaign (free) → check active count → show modal
3. Breaking trend on free tier → blur card + `<UpgradeCTA />`
4. AI credits at 0 → inline banner in studio
5. Analytics > 7 days requested → gated component

### Task 11.12: WebSocket client hook

- [ ] Create `apps/web/lib/ws.ts`:

```typescript
"use client";
import { useEffect, useCallback, useRef } from "react";

type TrendUpdate = { platform: string; keyword: string; status: string; opportunityScore: number };

export function useTrendSocket(onTrend: (trend: TrendUpdate) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);
    ws.onmessage = (event) => {
      try { onTrend(JSON.parse(event.data as string)); } catch {}
    };
    ws.onclose = () => setTimeout(connect, 3000); // Auto-reconnect
    wsRef.current = ws;
  }, [onTrend]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);
}
```

- [ ] Commit: `git commit -m "feat: frontend — dashboard, trend feed, content studio, campaign manager, analytics"`

---

## Chunk 12: GDPR + Email Notifications

**Files:** tRPC `gdpr` router, Resend integration, data export async job

### Task 12.1: Resend email setup

- [ ] Install: `pnpm --filter @hook/worker add resend`
- [ ] Create `apps/worker/src/email.ts`:

```typescript
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDeadLetterAlert(to: string, postInfo: { platform: string; scheduledFor: Date; error: string }) {
  await resend.emails.send({
    from: "HOOK <noreply@usehook.co>",
    to,
    subject: "Post failed to publish",
    html: `<p>Your ${postInfo.platform} post scheduled for ${postInfo.scheduledFor.toLocaleString()} failed to publish after 4 attempts.</p>
           <p>Error: ${postInfo.error}</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/queue">Review in HOOK</a></p>`,
  });
}

export async function sendReauthAlert(to: string, platform: string) {
  await resend.emails.send({
    from: "HOOK <noreply@usehook.co>",
    to,
    subject: `Reconnect your ${platform} account`,
    html: `<p>Your ${platform} account needs to be reconnected. Posts are paused until you re-authenticate.</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Reconnect now</a></p>`,
  });
}
```

### Task 12.2: GDPR data export

- [ ] Add to tRPC router `packages/trpc/src/router/gdpr.ts`:

```typescript
export const gdprRouter = router({
  requestDataExport: protectedProcedure.mutation(async ({ ctx }) => {
    // Queue async export job in worker via BullMQ
    // Worker collects all creator data, zips to R2, emails download link
    await fetch(`${process.env.WORKER_URL}/internal/gdpr/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": process.env.WORKER_INTERNAL_SECRET! },
      body: JSON.stringify({ creatorId: ctx.userId }),
    });
  }),

  requestAccountDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.update(creators)
      .set({ gdprDeletionRequestedAt: new Date() })
      .where(eq(creators.id, ctx.userId));
    // Cascade: tokens revoked, campaigns deactivated, Stripe cancelled
    // Async job scheduled — full deletion within 30 days
  }),
});
```

- [ ] Commit: `git commit -m "feat: GDPR data export/deletion + Resend email alerts"`

---

## Chunk 13: CI + Deployment

**Files:** `.github/workflows/ci.yml`, `vercel.json`, Railway config

### Task 13.1: GitHub Actions CI

- [ ] Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: hook_test
          POSTGRES_USER: hook
          POSTGRES_PASSWORD: test_password
        ports: ["5432:5432"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    env:
      DATABASE_URL: postgresql://hook:test_password@localhost:5432/hook_test
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install
      - run: pnpm --filter @hook/db db:migrate
      - run: pnpm test
      - run: pnpm build
```

### Task 13.2: Environment setup in Vercel + Railway

- [ ] In Vercel dashboard: set all `NEXT_PUBLIC_*` and server-side env vars. Set root directory to `apps/web`.
- [ ] In Railway: create service pointing to `apps/worker`. Set `START_COMMAND=node dist/index.js`. Add all env vars.
- [ ] Commit + push to trigger first CI run.
- [ ] Verify: CI passes, Vercel preview URL loads, Railway worker health check returns `{ status: "ok" }`.

---

## Execution Order

Run chunks in this order (each depends on the previous):

```
Chunk 0 (Foundation) → Chunk 1 (DB Schema) → Chunk 2 (Crypto)
→ Chunk 3 (Auth) → Chunk 4 (tRPC) → Chunk 5 (Stripe)
→ Chunk 6 (Platform Adapters) → Chunk 7 (Trend Engine) [can parallel with →]
→ Chunk 8 (Content Studio) [can parallel with Chunk 7]
→ Chunk 9 (Scheduler + Publisher) → Chunk 10 (Analytics)
→ Chunk 11 (Frontend) → Chunk 12 (GDPR) → Chunk 13 (CI)
```

Chunks 7 and 8 have no dependency on each other — can be executed in parallel by two subagents once Chunk 6 is complete.

---

## Pre-Launch Checklist

- [ ] Apply for X API Elevated access (needed for trending topics endpoint)
- [ ] Apply for Meta App Review (Instagram Graph API publishing)
- [ ] Apply for TikTok Content Posting API (pending — MVP launches without if delayed)
- [ ] Apply for LinkedIn Partner Program (pending — MVP launches without if delayed)
- [ ] Register `hk.io` domain (or equivalent) for funnel shortlinks
- [ ] Set up Cloudflare R2 bucket `hook-media` with public-read policy
- [ ] Configure Stripe products: Creator (£19/mo) and Pro (£49/mo) with GBP+USD prices
- [ ] Set up Resend domain (sending domain verification)
- [ ] Upstash Redis instance (production)
- [ ] Supabase project + production DATABASE_URL

---

*Plan v1.0 — 2026-03-27 — HOOK Platform MVP*
