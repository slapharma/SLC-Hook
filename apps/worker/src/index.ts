import "dotenv/config";
import express from "express";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hook-worker" });
});

app.listen(PORT, () => {
  console.log(`[worker] Running on port ${PORT}`);
});
