import "dotenv/config";
import express from "express";
import { registerCrons } from "./crons/index.js";
import { startWebSocketServer } from "./ws/server.js";

const app = express();
const PORT = process.env.PORT ?? 3001;
const WS_PORT = Number(process.env.WS_PORT ?? 3002);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hook-worker" });
});

app.listen(PORT, async () => {
  console.log(`[worker] Running on port ${PORT}`);

  // Register BullMQ repeatable cron jobs
  await registerCrons().catch((err) => {
    console.error("[worker] Failed to register crons:", err);
  });

  // Start WebSocket server for real-time trend push
  startWebSocketServer(WS_PORT);
});
