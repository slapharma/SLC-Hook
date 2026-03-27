import { describe, it, expect } from "vitest";
import type { PlatformAdapter, PublishResult } from "../types.js";

const stubAdapter: PlatformAdapter = {
  platform: "x",
  publishPost: async (_account, _post): Promise<PublishResult> => ({
    success: true,
    platformPostId: "stub_id",
  }),
  fetchAnalytics: async (_account, _postId) => ({
    impressions: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    linkClicks: 0,
    followerDelta: 0,
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
