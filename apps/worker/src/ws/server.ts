import { WebSocketServer, WebSocket } from "ws";
import { redisSub } from "../redis.js";

export function startWebSocketServer(port: number) {
  const wss = new WebSocketServer({ port });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  redisSub.subscribe("trends:new", (err) => {
    if (err) console.error("Redis subscribe error", err);
  });

  redisSub.on("message", (_channel, message) => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  console.log(`[ws] WebSocket server running on ws://localhost:${port}`);
  return wss;
}
