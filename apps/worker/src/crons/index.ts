import { trendPollingQueue, tokenRefreshQueue } from "../queues/index.js";

export async function registerCrons() {
  // Poll X trends every 15 minutes
  await trendPollingQueue.add(
    "poll-x",
    { platform: "x" },
    {
      repeat: { pattern: "*/15 * * * *" },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );

  // Refresh expiring tokens every 30 minutes
  await tokenRefreshQueue.add(
    "refresh-all",
    {},
    {
      repeat: { pattern: "*/30 * * * *" },
      removeOnComplete: 5,
    }
  );
}
