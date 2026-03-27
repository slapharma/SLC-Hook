import { describe, it, expect } from "vitest";
import {
  creators, sessions, oauthAccounts, connectedAccounts,
  campaigns, trendSignals, campaignPosts, posts, postAnalytics,
  funnelClicks, funnelConversions
} from "../schema/index.js";

describe("schema exports", () => {
  it("exports all required tables", () => {
    expect(creators).toBeDefined();
    expect(sessions).toBeDefined();
    expect(oauthAccounts).toBeDefined();
    expect(connectedAccounts).toBeDefined();
    expect(campaigns).toBeDefined();
    expect(trendSignals).toBeDefined();
    expect(campaignPosts).toBeDefined();
    expect(posts).toBeDefined();
    expect(postAnalytics).toBeDefined();
    expect(funnelClicks).toBeDefined();
    expect(funnelConversions).toBeDefined();
  });

  it("creators table has required columns", () => {
    const cols = Object.keys(creators);
    expect(cols).toContain("id");
    expect(cols).toContain("email");
    expect(cols).toContain("subscriptionTier");
    expect(cols).toContain("aiCreditsRemaining");
  });
});
