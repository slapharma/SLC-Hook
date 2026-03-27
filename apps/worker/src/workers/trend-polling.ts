import { TwitterApi } from "twitter-api-v2";
import { db } from "@hook/db";
import { trendSignals } from "@hook/db/schema";
import { redisPub } from "../redis.js";

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

const WOEID_WORLDWIDE = 1;

export async function pollXTrends() {
  const client = new TwitterApi(process.env.X_BEARER_TOKEN!);
  let trends: Array<{ keyword: string; velocity: number }> = [];

  try {
    const response = await client.v1.trendingPlaces(WOEID_WORLDWIDE);
    trends =
      response[0]?.trends?.map((t) => ({
        keyword: t.name,
        velocity: t.tweet_volume
          ? Math.min(100, Math.log10(t.tweet_volume) * 20)
          : 50,
      })) ?? [];
  } catch {
    // Basic API tier fallback — trending topics require Pro+
    console.warn(
      "X trending topics unavailable on current API tier — skipping"
    );
    return;
  }

  for (const trend of trends.slice(0, 20)) {
    const opportunityScore = calculateOpportunityScore({
      velocity: trend.velocity,
      relevance: 50,
      saturation: 30,
    });

    const status: "breaking" | "rising" | "established" =
      trend.velocity > 80
        ? "breaking"
        : trend.velocity > 50
          ? "rising"
          : "established";

    await db
      .insert(trendSignals)
      .values({
        platform: "x",
        keyword: trend.keyword,
        opportunityScore,
        velocityScore: trend.velocity,
        saturationScore: 30,
        status,
        source: "x_api",
        estimatedExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        rawData: { tweetVolume: trend.velocity },
      })
      .onConflictDoNothing();

    if (status === "breaking" || status === "rising") {
      await redisPub.publish(
        "trends:new",
        JSON.stringify({ platform: "x", keyword: trend.keyword, status, opportunityScore })
      );
    }
  }
}
