import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

type WSClient = {
  ws: WebSocket;
  userId: string;
  role: string;
};

const clients: WSClient[] = [];

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    // Parse userId from query string (set by client after auth)
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId") || "";
    const role = url.searchParams.get("role") || "teacher";

    if (!userId) {
      ws.close(1008, "userId required");
      return;
    }

    const client: WSClient = { ws, userId, role };
    clients.push(client);

    ws.on("close", () => {
      const idx = clients.indexOf(client);
      if (idx !== -1) clients.splice(idx, 1);
    });

    ws.on("error", () => {
      const idx = clients.indexOf(client);
      if (idx !== -1) clients.splice(idx, 1);
    });
  });

  return wss;
}

/** Send a message to a specific user */
export function notifyUser(userId: string, event: string, data: any) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  clients
    .filter(c => c.userId === userId && c.ws.readyState === WebSocket.OPEN)
    .forEach(c => c.ws.send(payload));
}

/** Send a message to all teachers (e.g., when a student completes something) */
export function notifyTeachers(event: string, data: any) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  clients
    .filter(c => c.role === "teacher" && c.ws.readyState === WebSocket.OPEN)
    .forEach(c => c.ws.send(payload));
}

/** Broadcast to all connected clients */
export function broadcast(event: string, data: any) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  clients
    .filter(c => c.ws.readyState === WebSocket.OPEN)
    .forEach(c => c.ws.send(payload));
}
