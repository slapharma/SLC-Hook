import type { connectedAccounts } from "@hook/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Platform = "x" | "tiktok" | "instagram" | "linkedin";

export type ConnectedAccountRow = InferSelectModel<typeof connectedAccounts>;

export type PostPayload = {
  platform: Platform;
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
  platform: Platform;
  publishPost(account: ConnectedAccountRow, post: PostPayload): Promise<PublishResult>;
  fetchAnalytics(account: ConnectedAccountRow, platformPostId: string): Promise<AnalyticsResult>;
  refreshToken(account: ConnectedAccountRow): Promise<ConnectedAccountRow>;
  revokeToken(account: ConnectedAccountRow): Promise<void>;
}
