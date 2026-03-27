import type { PlatformAdapter } from "../types.js";

export const tiktokAdapter: PlatformAdapter = {
  platform: "tiktok",
  async publishPost() {
    throw new Error("TikTok API integration pending approval");
  },
  async fetchAnalytics() {
    throw new Error("TikTok API integration pending approval");
  },
  async refreshToken(account) {
    return account;
  },
  async revokeToken() {},
};
