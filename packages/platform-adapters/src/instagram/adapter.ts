import type {
  PlatformAdapter,
  ConnectedAccountRow,
  PostPayload,
  PublishResult,
  AnalyticsResult,
} from "../types.js";
import { decryptToken } from "@hook/db/crypto";

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!;
const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function graphFetch(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<any>;
}

export const instagramAdapter: PlatformAdapter = {
  platform: "instagram",

  async publishPost(account, post): Promise<PublishResult> {
    try {
      const token = decryptToken(account.encryptedAccessToken, ENCRYPTION_KEY);
      const igUserId = account.platformAccountId;

      const containerParams: Record<string, string> = {
        caption: post.contentBodyFormatted,
        access_token: token,
      };

      if (post.mediaR2Urls && post.mediaR2Urls.length > 0) {
        containerParams.image_url = post.mediaR2Urls[0];
        containerParams.media_type = "IMAGE";
      } else {
        containerParams.media_type = "REELS";
        containerParams.share_to_feed = "true";
      }

      const container = await graphFetch(`${igUserId}/media`, containerParams);

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
    for (const item of data.data) {
      metrics[item.name] = item.values?.[0]?.value ?? 0;
    }
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

  async refreshToken(account) {
    return account;
  },

  async revokeToken() {},
};
