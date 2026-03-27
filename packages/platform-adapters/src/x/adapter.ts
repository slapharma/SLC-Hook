import { TwitterApi } from "twitter-api-v2";
import type {
  PlatformAdapter,
  ConnectedAccountRow,
  PostPayload,
  PublishResult,
  AnalyticsResult,
} from "../types.js";
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
        const tweet = await client.v2.tweet(
          part,
          replyToId ? { reply: { in_reply_to_tweet_id: replyToId } } : undefined
        );
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
      followerDelta: 0,
    };
  },

  async refreshToken(account) {
    return account;
  },

  async revokeToken(account) {
    const accessToken = decryptToken(account.encryptedAccessToken, ENCRYPTION_KEY);
    const client = new TwitterApi(accessToken);
    await client.v2.revokeOAuth2Token(accessToken, "access_token");
  },
};
