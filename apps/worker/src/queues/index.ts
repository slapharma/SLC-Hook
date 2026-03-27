import { Queue } from "bullmq";
import { redis } from "../redis.js";

export const trendPollingQueue = new Queue("trend-polling", { connection: redis });
export const postPublisherQueue = new Queue("post-publisher", { connection: redis });
export const analyticsQueue = new Queue("analytics-collector", { connection: redis });
export const tokenRefreshQueue = new Queue("token-refresh", { connection: redis });
