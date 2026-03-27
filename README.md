# HOOK — AI Social Media Automation for Creators

> Turn trends into revenue. Automatically.

HOOK is a freemium SaaS platform that helps solo creators and personal brands grow engaged audiences and drive revenue through AI-powered content automation across X, TikTok, Instagram, and LinkedIn.

## Repository Contents

```
hook-brand/
├── assets/
│   └── logo.svg                  # HOOK brand logo (violet-cyan gradient)
├── business-pack/
│   └── index.html                # Investor-facing marketing & business pack
└── demo/
    └── index.html                # Interactive 5-screen app demo (no backend)

docs/
└── superpowers/specs/
    └── 2026-03-27-hook-platform-design.md   # Full platform design spec v1.1
```

## Quick Start

Open either HTML file directly in a browser — no server required.

- **Business Pack**: `hook-brand/business-pack/index.html` — investor pitch, market data, pricing, GTM strategy
- **App Demo**: `hook-brand/demo/index.html` — interactive walkthrough of Dashboard, Trend Engine, Content Studio, Scheduler, Analytics

## Brand

| Token | Value |
|-------|-------|
| Primary | `#7C3AED` (Violet) |
| Secondary | `#06B6D4` (Cyan) |
| Background | `#080810` (Near-black) |
| Font | Syne (headings), Inter (body) |

## Product Vision

**Core Loop:** DISCOVER → CREATE → REFINE → SCHEDULE → OPTIMIZE

**Tiers:**
- Free — 1 platform, 1 campaign, 5 AI posts/month
- Creator £19/mo — 3 platforms, 5 campaigns, 50 AI posts/month
- Pro £49/mo — all platforms, unlimited campaigns & posts

## Stack (Planned)

Next.js 15 · tRPC v11 · Drizzle ORM · PostgreSQL (Supabase) · BullMQ + Redis · Lucia v3 · Claude API (claude-sonnet)

---

*This repository contains planning and brand assets only. Product development has not started.*
