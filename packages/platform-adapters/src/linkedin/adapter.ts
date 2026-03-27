import type { PlatformAdapter } from "../types.js";

export const linkedinAdapter: PlatformAdapter = {
  platform: "linkedin",
  async publishPost() {
    throw new Error("LinkedIn API integration pending approval");
  },
  async fetchAnalytics() {
    throw new Error("LinkedIn API integration pending approval");
  },
  async refreshToken(account) {
    return account;
  },
  async revokeToken() {},
};
