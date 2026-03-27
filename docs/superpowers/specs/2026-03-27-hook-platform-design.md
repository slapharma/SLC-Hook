# HOOK Platform — Product Design Specification

**Version:** 1.1 (post-review)
**Date:** 2026-03-27
**Status:** Approved for implementation planning
**Author:** Claude (Sonnet 4.6) via HOOK Brainstorming Session

---

## 1. Executive Summary

HOOK is a multi-platform social media automation SaaS for solo creators. It combines real-time trend intelligence across X, TikTok, Instagram, and LinkedIn with AI-powered hook generation, campaign-based scheduling, and funnel-connected analytics. The primary outcome is creator revenue growth; the foundational mechanism is compounding follower growth through systematic, trend-reactive content.

**Primary outcome:** Creator revenue generation
**Foundational targets:** Engaged follower growth → traffic → funnel conversion
**Business model:** Freemium SaaS (Free / Creator £19/mo / Pro £49/mo)
**Geographic target:** English-speaking markets — UK primary, US/AU/CA secondary
**Pricing currency:** GBP primary with USD parity pricing via Stripe multi-currency (£19 / $24, £49 / $62)

---

## 2. Brand Identity

### 2.1 Name & Domain
- **Product name:** HOOK
- **Domain targets:** `hook.so` / `usehook.co` / `gethook.io`
- **App store handle:** `@usehook`

### 2.2 Brand Position
> "HOOK is the AI-powered growth engine for creators who refuse to post blind. See what's trending, write what stops thumbs, publish everywhere — before the wave breaks."

**Hero headline:** *Stop thumbs. Start funnels.*

**Tagline variants (A/B test at launch):**
- "The first 3 seconds win the internet."
- "Built for creators who play to win."
- "Trends in. Revenue out."

### 2.3 Brand Personality
| Dimension | Value |
|---|---|
| Personality | Confident, sharp, slightly irreverent |
| Tone of voice | Direct. No fluff. Speaks in hooks itself. |
| Archetype | The Magician — transforms effort into impact |
| Anti-archetype | NOT the Sage (no lectures), NOT the Jester (no fluff) |

### 2.4 Visual Identity System

**Color Palette:**
| Token | Hex | Usage |
|---|---|---|
| Background | `#080810` | App chrome, page backgrounds |
| Surface | `#0F0F1A` | Cards, panels, sidebars |
| Surface raised | `#161625` | Modals, elevated cards |
| Primary accent | `#7C3AED` | Violet — CTAs, active states, highlights |
| Secondary accent | `#06B6D4` | Cyan — trend signals, live data, alerts |
| Danger/viral | `#F43F5E` | Viral score indicators, high-urgency alerts |
| Gold/reward | `#F59E0B` | Badges, streaks, upgrade prompts |
| Text primary | `#F8FAFC` | Headlines, key data |
| Text secondary | `#94A3B8` | Body copy, labels |
| Border subtle | `rgba(255,255,255,0.06)` | Card borders, dividers |

**Typography:**
| Role | Font | Weight |
|---|---|---|
| Display / Hero | Syne | 800, all caps |
| UI headings | Inter | 600–700 |
| Body / labels | Inter | 400–500 |
| Data / numbers | JetBrains Mono | 500, tabular |
| Hook previews | Inter | 700, larger |

**Motion language:** 150ms transitions. Cards slide in from below (12px). Trend alerts pulse with cyan glow. No bounces.

**Logo:** HOOK wordmark in Syne 800. The `O` contains a minimal upward-trending spark/hook glyph — readable as either a fishhook or a chart spike.

### 2.5 Competitive Positioning
| Competitor | Weakness HOOK exploits |
|---|---|
| Buffer / Hootsuite | Scheduling tools, not growth tools. No trend intelligence. |
| Taplio | LinkedIn-only. No cross-platform logic. |
| Hypefury | X-only. Narrow scope. |
| Lately.ai | Enterprise-focused, expensive, poor UX. |
| Predis.ai | Template-driven, no trend engine. |

**HOOK's white space:** The only platform that starts with *what's working right now* across all four platforms, generates hooks tuned to that signal, and connects every post to a monetisation funnel — built for solo creators, not enterprises.

---

## 3. Target Users

### 3.1 Primary (MVP)
**Solo creators / personal brand builders** — influencers, coaches, thought leaders, course creators, consultants growing their own audience and monetising through content.

**Persona:** "Strategic Sarah" — 2–5 years creating content, posting inconsistently, knows her niche, frustrated by not knowing what to post or when, wants to turn her audience into income.

### 3.2 Expansion Tiers
- **Phase 2:** Small business owners using social to drive customers into funnels
- **Phase 3:** Marketing agencies managing multiple client accounts

---

## 4. Platform Scope

All four platforms treated at equal priority, wrapped in a `PlatformAdapter` interface:

| Platform | API | Multi-account | App Review Required |
|---|---|---|---|
| X (Twitter) | X API v2 (OAuth 2.0) | ✅ Unlimited — each account via own OAuth token | Basic tier ($100/mo) — apply immediately |
| TikTok | TikTok Content Posting API | ✅ Multiple — each account via own OAuth flow | ⚠️ Requires app review (2–8 weeks) |
| Instagram | Instagram Graph API | ✅ Multiple business/creator accounts, each authenticated separately | ⚠️ Requires Meta App Review (1–4 weeks) |
| LinkedIn | LinkedIn API v2 | ✅ Personal profile + multiple company pages, each via OAuth | ⚠️ Requires LinkedIn Partner Program approval (4–12 weeks) |

**API strategy:** Official APIs only for MVP. Platform adapter architecture enables browser-automation to be added per-platform later without rewrite.

**Critical pre-launch dependency:** LinkedIn and TikTok API approvals have the longest timelines (up to 12 weeks). Apply for all platform APIs in Week 1 of development. If LinkedIn approval is delayed, launch MVP without LinkedIn and add it post-launch. X and Instagram have faster approval paths and should be prioritised for MVP.

**Fallback:** If TikTok/LinkedIn API approval is denied or delayed, MVP launches with X + Instagram only. Campaign UI is designed platform-agnostic so adding platforms requires no UI changes.

---

## 5. Core Product Architecture

### 5.1 The Product Loop
```
DISCOVER → CREATE → REFINE → SCHEDULE → OPTIMIZE
```
Every module feeds the next. Trend signals become prompts. Prompts become posts. Posts become performance data. Data trains better prompts. The loop compounds over time.

### 5.2 System Overview
```
┌─────────────────────────────────────────────────────────┐
│                     HOOK PLATFORM                        │
├──────────────┬──────────────┬──────────────┬────────────┤
│  TREND       │  CONTENT     │  CAMPAIGN    │  ANALYTICS │
│  ENGINE      │  STUDIO      │  SCHEDULER   │  ENGINE    │
└──────┬───────┴──────┬───────┴──────┬───────┴─────┬──────┘
       │              │              │             │
┌──────▼──────────────▼──────────────▼─────────────▼──────┐
│                  CAMPAIGN LAYER                          │
│  niche · funnel type · accounts · rules · schedule      │
└─────────────────────────────────────────────────────────┘
       │              │              │             │
┌──────▼──────┬────────▼──────┬──────▼──────┬──────▼──────┐
│   X API     │  TikTok API   │  IG Graph   │ LinkedIn    │
└─────────────┴───────────────┴─────────────┴─────────────┘
```

### 5.3 Real-Time Architecture Note (WebSocket)
The frontend requires real-time trend push for paid tiers. Vercel serverless functions cannot maintain persistent WebSocket connections. Resolution: A dedicated WebSocket server runs as a persistent process on Railway alongside the BullMQ workers. The Vercel API layer communicates with the Railway WebSocket server via Redis pub/sub. Clients connect to the Railway WebSocket endpoint (not Vercel) for live trend updates.

```
Creator browser → WS connect to Railway WS server
Trend Engine (Railway worker) → publishes to Redis channel
Railway WS server → subscribes to Redis channel → pushes to connected clients
Vercel API routes → handle all other API calls (tRPC)
```

### 5.4 Module 1: Trend Engine

**Purpose:** Continuous intelligence layer — surfaces what's breaking before it saturates.

**Data sources (honest assessment):**

| Platform | Data Source | Method | Freshness |
|---|---|---|---|
| X | X API v2 `/trends/place` + search/recent endpoints | Official API | Near real-time |
| TikTok | TikTok Research API (hashtag stats) + third-party: Trending.io, TrendTok via RapidAPI | Official + aggregator | 15–30 min lag |
| Instagram | Meta Graph API (hashtag search + top media) — **no native "trending topics" endpoint exists** | Official API with heuristic trending detection | 1–2 hour lag |
| LinkedIn | LinkedIn API does not expose trending signals. Source: Exploding Topics API (explodingTopics.com) filtered to professional/B2B keywords | Third-party | 4–12 hour lag |

**Instagram trending detection methodology:** Since Instagram has no trending topics API, HOOK detects emerging hashtags by monitoring volume growth: compare hashtag post count at T and T-24h; hashtags with >50% volume growth and >10K posts qualify as Rising. This is a heuristic, not a platform-provided signal. Disclosed to users as "Estimated trending."

**LinkedIn trending methodology:** Exploding Topics API provides topic velocity data. HOOK filters results by professional keyword taxonomy (business, marketing, finance, leadership, etc.) and cross-references with LinkedIn hashtag API for volume confirmation.

**Scoring algorithm per trend:**
- Velocity (0–100): speed of growth in last 2h / 24h, normalised by platform baseline
- Relevance (0–100): cosine similarity between trend keywords and creator niche embedding (via Claude embeddings API)
- Saturation (0–100): post volume relative to platform trend baseline — higher is more saturated
- Virality ceiling: **removed from formula** (no reliable data source). Replaced with Platform Amplification Score — a platform-specific constant based on known algorithmic reach characteristics (X threads: high, TikTok: very high, Instagram Reels: high, LinkedIn: medium)

**Composite Opportunity Score (0–100):** `(velocity × 0.40) + (relevance × 0.35) + ((1 - saturation_normalised) × 0.25)`

**Trend status labels:**
- 🔴 **Breaking** — velocity spike in last 2h, window < 6h
- 🟡 **Rising** — steady growth over 12–24h, still early
- 🟢 **Established** — peaked but still high-volume, safe to join
- ⚪ **Saturated** — avoid

**Niche personalisation:** Creator defines niche via 3–5 keywords + up to 3 competitor handles at onboarding. Competitor handles are used only to read their public posts and extract frequently used hashtags/topics — no private data accessed. This is permitted under all four platforms' public API terms. Niche profile is configurable per-campaign.

**Delivery:**
- Real-time push (Creator/Pro tiers): Railway WebSocket server publishes Breaking and Rising alerts
- Daily digest (Free tier): Scheduled email via Resend + in-app summary at 7am creator local time

### 5.5 Module 2: Content Studio

**Purpose:** Transform trend signals into platform-optimised, hook-first posts.

**AI credits definition (authoritative):**
- 1 credit = 1 Content Studio generation session
- A session includes: 5 hook variants + 1 full post body (for the selected hook)
- A session does NOT include: post edits, re-generations count as a new session
- Free tier: 10 sessions/month. Creator: 100/month. Pro: unlimited (API cost absorbed).

**Hook Generator:**
Given: trend signal + creator niche + target platform + campaign tone rules
Outputs: 5 hook variants using 5 frameworks:

| # | Framework | Example |
|---|---|---|
| 1 | Curiosity gap | "Nobody talks about the reason most creators never hit 10k..." |
| 2 | Contrarian | "Posting every day is killing your growth. Here's what actually works." |
| 3 | Number/list | "7 signs your content strategy is already dead (and you don't know it)" |
| 4 | Personal stakes | "I lost 3,000 followers in a week. This is what I learned." |
| 5 | Bold claim | "The algorithm doesn't reward consistency. It rewards this." |

**Free tier framework access:** All 5 frameworks are available on the Free tier for MVP. Post-MVP, frameworks 4 and 5 (Personal Stakes, Bold Claim) are gated to Creator+ to create an upgrade incentive. This is a deliberate deferred gate — do not implement the restriction in MVP.

**Post Builder:**
Once hook selected → AI generates full post body. Platform-specific formatting is automatic:
- X: thread structure, hashtags, character limits per tweet in thread
- TikTok: video script (hook line / 3-point body / CTA) — **text only**, not video file. Creator films; HOOK writes the script.
- Instagram: caption with hashtags, line breaks, CTA
- LinkedIn: article-style with professional framing, no hashtag stuffing

**Media handling:**
- HOOK is a text/script tool, not a video editor. For image posts (Instagram, LinkedIn), creators upload media separately.
- Media upload: HOOK accepts JPEG/PNG/GIF/MP4 up to 50MB via signed R2 upload URLs. Stored per-post in Cloudflare R2.
- Platform-specific media specs are validated client-side before upload (e.g. Instagram: min 1080px, 4:5 ratio preferred; LinkedIn: 1200×627px for link previews).
- TikTok video: HOOK generates the script; video file upload to TikTok is handled by the creator outside HOOK. TikTok Content Posting API video upload is a Phase 2 feature.

**Funnel CTA injection:** Based on campaign monetisation model:
- Email capture: "Link in bio to get my free [lead magnet]"
- Direct sale: "Link in bio — [product name] closes [date]"
- Affiliate: natural product mention with FTC/ASA disclosure
- Sponsorship: [Paid partnership] format per platform requirements

**Campaign content rules (per campaign):**
- Tone: educational / entertaining / motivational / controversial
- Content-to-promotion ratio (default 4:1)
- Topics always include / always avoid
- Brand voice keywords (appended to every Claude system prompt)

**Content moderation:** Before a post enters the Approved state, HOOK runs a lightweight safety check via Claude (a separate, low-cost call) that flags: hate speech, sexual content, platform-violating claims (e.g. "guaranteed returns"), doxxing, spam patterns. Flagged posts are held in a `pending_review` state with the specific flag shown to the creator. Creators can override the flag (it is advisory, not blocking) — but HOOK logs the override for ToS audit purposes. This protects HOOK's developer API accounts from suspension.

**AI model:** Anthropic Claude (claude-sonnet-4-6) for generation. Claude Haiku for moderation checks (cost efficiency).

### 5.6 Module 3: Campaign Scheduler

**Purpose:** Execution layer — manages the queue across all connected accounts.

**Campaign structure:**
```
Creator
 └── Campaign (unlimited for all tiers)
      ├── Niche + tone config
      ├── Funnel type + destination URL
      ├── Timezone (inherits from Creator, overridable per campaign)
      ├── Connected accounts (any combination across platforms)
      ├── Automation rules (JSON — schema present in MVP, UI deferred to Phase 2)
      ├── Post queue (Draft → Approved → Scheduled → Published)
      └── Schedule strategy config
```

**Campaign timezone:** Campaigns inherit the creator's timezone by default. Overridable per-campaign for creators managing accounts targeting different regions. All scheduling times are stored in UTC; displayed in campaign timezone. `Campaign` entity includes a `timezone` field (IANA timezone string, e.g. `Europe/London`).

**Multi-account assignment:** A campaign can post to any subset of a creator's connected accounts. Each account maintains its own rate-limit tracker and retry queue. A post to 3 accounts creates 3 `Post` records — one per account — linked to a single `CampaignPost` parent record.

**Tier limits enforcement (clarified):**
| Limit | Free | Creator | Pro |
|---|---|---|---|
| Active campaigns | 1 | 5 | Unlimited |
| Connected accounts per platform | 1 | 3 | Unlimited |
| Scheduled posts per month | 30 | 300 | Unlimited |
| AI generation sessions | 10 | 100 | Unlimited |

All campaigns can be created by any tier (the data model supports unlimited campaigns always). Limits are enforced at the point of *activating* a campaign (setting it to `active` status), not at creation. This means creators can plan unlimited campaigns, but only activate the permitted number. This prevents data loss and reduces friction.

**Automation rules engine:**
- The `automation_rules` JSONB field is present in the `Campaign` schema from MVP.
- The IF/THEN rules *builder UI* is Phase 2.
- In MVP, a small set of pre-configured automation rules are available as toggle switches (not a custom builder):
  - "Auto-generate posts when queue drops below 3" (Creator+)
  - "Flag Breaking trends in my niche for review" (Creator+)
- Full custom IF/THEN rule builder is Phase 2.

**Post retry logic:**
When a post fails to publish (API error, rate limit, token expiry):
1. Retry after 5 minutes (attempt 2)
2. Retry after 30 minutes (attempt 3)
3. Retry after 2 hours (attempt 4)
4. After 4 failures: mark as `failed`, move to `dead_letter_queue`, notify creator via email + in-app notification with specific error reason
5. Creator can manually retry from the queue UI

**Token refresh:**
- `ConnectedAccount` stores `token_expires_at`. A BullMQ cron job runs every 30 minutes and refreshes any token expiring within the next 2 hours.
- If a refresh fails (e.g. creator revoked access): mark account as `requires_reauth`, pause all campaigns using that account, notify creator via email + in-app banner with a re-authentication link.
- Posts scheduled for a `requires_reauth` account are moved to `paused` state, not failed — they resume automatically upon re-authentication.

**Scheduling strategies library:**
| Strategy | Description |
|---|---|
| Power Hours | Posts at 7–9am and 6–9pm creator local time (campaign timezone) |
| Consistency Ladder | Start 1x/day, +1/week until engagement drops |
| Trend Surfing | Post within 2h of Breaking trend alert |
| Cross-Platform Cascade | Same content adapted, staggered 2h apart per platform |
| Evergreen + Trending Mix | 60% evergreen, 40% trend-reactive |
| Thread Bombing | X: long thread at peak hour + reply continuation 3h later |

**Post states:** `draft` → `approved` → `scheduled` → `publishing` → `published` | `failed` → `dead_letter`

**Queue UI:** Drag-and-drop calendar. Filter by platform, account, campaign, status.

### 5.7 Module 4: Analytics Engine

**Purpose:** Close the learning loop. Make every post smarter than the last.

**Per-post metrics:** Impressions, reach, likes, comments, shares, saves, link clicks, follower delta, reply sentiment score (Claude Haiku-rated, 0–1 scale)

**Per-campaign metrics:** Total reach, follower growth rate, engagement rate, link clicks, funnel conversion rate (see below), hook framework performance distribution

**Funnel conversion tracking methodology:**
HOOK wraps all funnel destination URLs in a HOOK-owned redirect shortener (e.g. `hk.io/[code]`). This redirect:
1. Records the click with post_id, timestamp, platform, and a hashed anonymous user identifier
2. Optionally accepts a `?conversion=1` postback URL parameter — creators configure their email tool / checkout / landing page to fire this when a conversion occurs
3. Alternatively, creators can install a HOOK tracking pixel (1×1 pixel) on their landing page for passive conversion tracking

**"Estimated revenue influenced"** is removed from the analytics spec. Actual revenue data is not available without deep third-party integrations. Replaced with: "Funnel clicks" (tracked via HOOK redirect) and "Reported conversions" (via postback or pixel). Revenue attribution is the creator's responsibility.

**Hook framework performance:** Every framework scored by actual engagement per creator/platform. Updated nightly as a materialised view. Weights future generation (Claude prompt instructs: "prefer [top_framework] based on this creator's history").

**Scheduling optimisation:** Weekly "best time to post" report derived from actual per-creator performance data. Not global averages.

**Viral score prediction:** Pre-publish score (0–100). Components: hook strength (Claude-rated), trend alignment (Opportunity Score of linked trend), platform + time alignment (based on creator's historical best times), historical creator performance on similar content. Framed explicitly as "Predicted score — not a guarantee."

---

## 6. Data Model

### Core Entities

**Creator**
```
id, email, name, niche_keywords[], avatar_url
subscription_tier (free | creator | pro)
subscription_stripe_id, subscription_status
ai_credits_remaining, ai_credits_reset_at
timezone (IANA string, e.g. "Europe/London")
onboarding_completed_at
gdpr_data_export_requested_at
gdpr_deletion_requested_at
created_at, updated_at
```

**ConnectedAccount**
```
id, creator_id (FK)
platform (x | tiktok | instagram | linkedin)
platform_account_id, handle, display_name, avatar_url
access_token (AES-256-GCM encrypted), refresh_token (AES-256-GCM encrypted)
encryption_key_id (FK to key rotation table)
token_expires_at, scopes[]
rate_limit_state (JSON: remaining, reset_at per endpoint)
auth_status (active | requires_reauth | suspended | disconnected)
connected_at, last_successful_post_at
```

**Campaign**
```
id, creator_id (FK), name, description
status (draft | active | paused | archived)
niche_keywords[], competitor_handles[]
funnel_type (email_capture | direct_sale | affiliate | sponsorship)
funnel_destination_url, funnel_shortlink_code
content_rules (JSONB: tone, ratio, topics_include[], topics_avoid[], brand_voice_keywords[])
automation_rules (JSONB array — schema reserved, Phase 2 UI)
schedule_strategy (JSONB: type + config)
timezone (IANA string — inherits from Creator, overridable)
connected_account_ids[] (FK references)
created_at, updated_at
```

**TrendSignal**
```
id, platform, keyword, topic, category
opportunity_score (0–100), velocity_score, saturation_score, relevance_methodology
status (breaking | rising | established | saturated)
detected_at, estimated_expires_at
source (x_api | tiktok_api | instagram_heuristic | exploding_topics)
raw_data (JSONB)
```

**CampaignPost** (parent record for multi-account posts)
```
id, campaign_id (FK)
content_body, hook_text, hook_framework
trend_signal_id (FK, nullable)
media_r2_keys[] (Cloudflare R2 object keys)
media_alt_texts[]
predicted_viral_score (0–100)
created_at
```

**Post** (one per connected account per CampaignPost)
```
id, campaign_post_id (FK), campaign_id (FK), connected_account_id (FK)
platform, content_body_formatted (platform-adapted version)
status (draft | approved | scheduled | publishing | published | failed | dead_letter | paused)
scheduled_for (UTC), published_at, published_platform_id
approval_required (bool), approved_at
publish_attempts (int), last_attempt_at, last_error (text)
created_at, updated_at
```

**PostAnalytics**
```
id, post_id (FK), collected_at
impressions, reach, likes, comments, shares, saves
link_clicks, follower_delta
engagement_rate (computed), reply_sentiment_score (0–1, nullable)
```

**FunnelClick**
```
id, campaign_id (FK), post_id (FK)
shortlink_code, clicked_at
platform, anonymous_user_hash
```

**FunnelConversion**
```
id, funnel_click_id (FK, nullable), campaign_id (FK)
source (postback | pixel), converted_at
```

**HookPerformance** (materialised view, updated nightly)
```
campaign_id (FK), hook_framework, platform
avg_engagement_rate, p90_engagement_rate
sample_count, last_computed_at
```

---

## 7. GDPR & Data Lifecycle

### 7.1 Data Retention
- Post content and analytics: retained for the duration of the subscription + 90 days after cancellation
- Creator account data: retained for 12 months after account deletion request (for fraud/abuse investigation), then permanently deleted
- Platform OAuth tokens: deleted immediately upon account disconnection or creator deletion request

### 7.2 Right to Erasure
- Creator requests data deletion via Settings → Account → "Delete my account"
- Triggers: immediate token revocation on all platforms, campaign deactivation, and queues an async job to delete all creator data within 30 days
- Stripe subscription cancellation is triggered automatically
- Creator receives email confirmation with deletion timeline

### 7.3 Data Export
- Creator can request a full data export (posts, analytics, campaigns) via Settings
- Export is generated as a JSON archive, stored temporarily in R2 with a signed 24h download URL, and emailed to the creator

### 7.4 Token Security
- All OAuth tokens encrypted at rest using AES-256-GCM
- Encryption key stored in a separate key management table with rotation support
- Keys are never logged; tokens are never exposed in API responses

---

## 8. Technical Stack

### 8.1 Frontend
| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for marketing/SEO, CSR for dashboard |
| Language | TypeScript | Type safety end-to-end |
| UI components | shadcn/ui + Radix | Accessible, unstyled, full design control |
| Styling | Tailwind CSS 4 | Rapid, consistent |
| Data fetching | TanStack Query v5 | Cache management, background refetching |
| Forms | React Hook Form + Zod | Validation-first |
| Charts | Recharts + custom SVG | Engagement graphs, viral score meters |
| DnD calendar | @dnd-kit | Post queue drag-and-drop |
| Animation | Framer Motion | Trend alerts, score animations |
| Real-time | Native WebSocket client | Connects to Railway WS server (not Vercel) |

### 8.2 Backend
| Layer | Choice | Rationale |
|---|---|---|
| API | tRPC v11 | Type-safe end-to-end |
| Runtime | Node.js 22 + Express | Proven, familiar |
| Background jobs | BullMQ + Redis | Trend polling, scheduled posts, retry queues, token refresh cron |
| WebSocket server | ws (npm) on Railway | Persistent process for real-time push — cannot use Vercel serverless |
| Database | PostgreSQL (Supabase) | Relational + JSONB for flexible rule/config storage |
| ORM | Drizzle ORM | Type-safe migrations |
| Auth | Lucia v3 + platform OAuth | Creator login + per-platform token management |
| Token security | AES-256-GCM + key rotation | Platform access tokens encrypted at rest |
| File storage | Cloudflare R2 (S3-compatible) | Media attachments — signed upload URLs |
| AI/LLM (generation) | Anthropic Claude claude-sonnet-4-6 | Hook generation, post writing |
| AI/LLM (moderation + sentiment) | Anthropic Claude claude-haiku-4-5 | Cost-efficient for high-frequency checks |
| AI/LLM (embeddings) | Anthropic Embeddings API | Niche-to-trend relevance scoring |
| Trend data (X) | X API v2 | Official |
| Trend data (TikTok) | TikTok Research API + Trending.io via RapidAPI | Official + aggregator backup |
| Trend data (Instagram) | Meta Graph API (hashtag volume heuristic) | Official API, heuristic trending detection |
| Trend data (LinkedIn) | Exploding Topics API | Third-party, professional topic velocity |
| Email | Resend | Transactional + daily digests |
| Payments | Stripe | Subscriptions, multi-currency (GBP + USD) |
| URL shortener | Custom (HOOK-owned `hk.io` domain) | Funnel click tracking |

### 8.3 Infrastructure
| Layer | Choice |
|---|---|
| Frontend + tRPC API | Vercel (serverless) |
| Background workers + WebSocket | Railway (persistent Node processes) |
| Redis | Upstash (serverless-compatible, also accessible from Railway) |
| Database | Supabase PostgreSQL |
| File storage | Cloudflare R2 |
| CDN | Cloudflare |
| Monitoring | Sentry (errors) + Vercel Analytics (frontend) + Railway metrics (workers) |

---

## 9. Revenue Model

### 9.1 Tier Structure
| Feature | Free | Creator £19/mo | Pro £49/mo |
|---|---|---|---|
| Connected accounts per platform | 1 | 3 | Unlimited |
| Active campaigns (concurrent) | 1 | 5 | Unlimited |
| Draft campaigns (planned) | Unlimited | Unlimited | Unlimited |
| Scheduled posts per month | 30 | 300 | Unlimited |
| AI generation sessions | 10/mo | 100/mo | Unlimited |
| Trend feed | Daily digest email | Real-time dashboard | Real-time + push alerts |
| Hook frameworks | All 5 (MVP) → 3 post-MVP | All 5 | All 5 + custom voice |
| Scheduling strategies | Power Hours only | All strategies | All + A/B testing |
| Automation rules (Phase 2) | None | 3 rules/campaign | Unlimited |
| Analytics retention | 7 days | 90 days | Full history + export |
| Funnel integrations | 1 type | All types | All + custom webhooks |
| GDPR data export | ✅ | ✅ | ✅ |
| Support | Community | Email | Priority + onboarding call |

### 9.2 AI Credits
- Free: 10 sessions/month (1 session = 5 hooks + 1 full post). Resets on billing date.
- Creator/Pro: Unlimited — Claude API cost absorbed into margin.
- Cost basis: ~$0.018 per session (claude-sonnet-4-6 at current pricing). At 100 sessions/month for Creator tier: $1.80/month Claude cost against £19 revenue — sustainable.
- Break-even estimate: ~600 paying Creator subscribers covers fixed infrastructure costs (Supabase, Railway, Vercel, Redis). Based on: £350/mo infra + £200/mo API costs + £150/mo third-party data = £700/mo fixed. 600 × £19 × 0.78 margin = £8,892/mo gross profit. **This is an estimate requiring validation against actual infra invoices.**

### 9.3 Upgrade Triggers (built into UX)
- Connecting second account per platform → upgrade modal
- Activating second campaign (free) → upgrade modal
- Breaking trend alert fires — dashboard shows blurred teaser with "Unlock real-time alerts" CTA
- AI credits at 0 → "You're out of hooks for this month" with upgrade CTA
- Analytics older than 7 days requested → upgrade prompt
- A/B test scheduling requested → upgrade prompt

### 9.4 Pricing (multi-currency)
| Tier | Monthly GBP | Monthly USD | Annual GBP | Annual USD |
|---|---|---|---|---|
| Creator | £19 | $24 | £190 | $240 |
| Pro | £49 | $62 | £490 | $620 |

Stripe handles currency display based on billing country detection.

---

## 10. Onboarding Flow

1. **Sign up** — email + password or Google OAuth
2. **Name your niche** — free text + 3–5 keyword tags + optional competitor handles (public accounts only)
3. **Pick your monetisation model** — email capture / direct sale / affiliate / sponsorship
4. **Connect first platform account** — guided OAuth flow (X recommended as fastest approval)
5. **Create first campaign** — name, niche confirm, funnel URL, pick schedule strategy
6. **First hook moment** — HOOK surfaces 3 trending topics in niche + generates 5 hooks for the top one. Creator picks one, schedules first post.
7. **"You're live"** — confirmation: post in queue, next scheduled time, 3 tips for maximising first post

**Time to first value target:** < 5 minutes sign-up → first post in queue.

---

## 11. Go-To-Market Strategy

### Phase 1 — Seed (Months 1–6, target: 500 creators, £8K MRR)
- Product Hunt launch (free beta, no credit card)
- Founder posts daily on X and TikTok *using HOOK itself*
- "Made with HOOK" optional watermark → +5 AI credits/month incentive
- 30% affiliate commission programme (tracked via Stripe referral)
- Creator economy newsletter placements (e.g. The Publish Press, Creator Economy)

### Phase 2 — Growth (Months 7–18, target: 5,000 creators, £80K MRR)
- Agency tier (team seats, client campaigns, white-label reports)
- SEO content engine using HOOK's anonymised performance data
- Creator case studies + YouTube testimonials
- Podcast sponsorships

### Phase 3 — Scale (Months 19–36, target: 20,000 creators, £320K MRR)
- Hook template marketplace (community-built, revenue share)
- API access tier
- LinkedIn B2B specialisation push
- White-label offering for agencies

---

## 12. Key Metrics (North Star)

| Metric | Target (Month 6) | Why |
|---|---|---|
| Weekly Active Creators | 500 | Habitual usage proof |
| Posts published via HOOK | 50,000/week | Platform health |
| Avg follower growth rate (HOOK users) | +15%/month | Core value delivery |
| Free → Paid conversion | 8% | Revenue model validation |
| Creator MRR | £10,000 | Phase 1 sustainability |
| NPS | > 50 | Word-of-mouth flywheel |

---

## 13. MVP Scope (Phase 1 Build)

**In scope:**
- Creator auth (email + Google OAuth), full GDPR data lifecycle
- Connect up to 1 account per platform (Free tier enforcement)
- Trend feed — daily digest (Free) + real-time polling (Creator/Pro)
- Content Studio — all 5 hook frameworks + post builder for all connected platforms
- Campaign manager — unlimited draft campaigns, tier-enforced active limits, Power Hours scheduling, basic pre-built automation toggles
- Post queue — draft → approve → schedule → publish → analytics collect
- Media upload (images only, MVP) — JPEG/PNG up to 10MB, stored in R2
- Basic analytics — 7-day engagement data
- Funnel click tracking via HOOK shortlinks
- Stripe integration — Free / Creator / Pro with multi-currency
- Onboarding flow — 5 minutes to first post
- Content moderation safety check (Claude Haiku)
- Token refresh cron + failed auth re-authentication flow
- Post retry logic (4 attempts with backoff)
- GDPR data export + deletion flows

**Deferred to Phase 2:**
- Custom IF/THEN automation rules builder UI
- A/B strategy testing
- Custom webhooks
- TikTok video file upload
- Agency/team features
- Hook framework gating (Free tier stays at all 5 for MVP)
- Browser-automation fallback adapters

---

## 14. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LinkedIn/TikTok API approval delayed (4–12 weeks) | High | High | Apply Week 1. MVP launches with X + Instagram if needed. Platform adapter means adding later requires no UI changes. |
| X API rate limits restrict post volume | High | High | Per-account rate tracking in `ConnectedAccount.rate_limit_state`. Graceful backoff + creator notification. |
| TikTok Content API restricted further | Medium | High | Platform adapter pattern — swap to browser-automation per adapter without rewrite. |
| Instagram trending heuristic produces noisy signals | Medium | Medium | Label as "Estimated trending" in UI. Conservative velocity thresholds. Creator feedback loop to improve. |
| LinkedIn Exploding Topics data lag (4–12h) | Low | Low | Acceptable for LinkedIn's slower content velocity. Clearly labelled data freshness in UI. |
| Claude API costs exceed margin at scale | Medium | Medium | Haiku for moderation/sentiment (10x cheaper). Per-creator usage caps on Free tier. |
| Token refresh failures cascade to post failures | Medium | High | Token refresh runs 2h before expiry. Failed refresh pauses (not fails) posts. Creator notified immediately. |
| Creators violate platform ToS via HOOK | Low | High | Content moderation layer. HOOK ToS explicitly prohibits automated spam. Rate limiting enforced. |
| GDPR non-compliance | Low | High | Full data lifecycle documented. DPA required for EU users. Privacy policy and GDPR flows in MVP. |
| Freemium users never convert | High | High | "First hook moment" in onboarding before any paywall. Upgrade triggers on natural friction points, not arbitrary limits. |

---

*Spec v1.1 — reviewed and revised by Claude Sonnet 4.6 — 2026-03-27*
