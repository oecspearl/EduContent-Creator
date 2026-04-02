import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

type WSClient = {
  ws: WebSocket;
  userId: string;
  role: string;
};

const clients: WSClient[] = [];

function removeClient(client: WSClient) {
  const idx = clients.indexOf(client);
  if (idx !== -1) clients.splice(idx, 1);
}

function safeSend(ws: WebSocket, payload: string) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  } catch (e) {
    console.error("WebSocket send failed:", e);
  }
}

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

    ws.on("close", () => removeClient(client));

    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${userId}:`, error.message);
      removeClient(client);
    });
  });

  return wss;
}

/** Send a message to a specific user */
export function notifyUser(userId: string, event: string, data: any) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  clients
    .filter(c => c.userId === userId)
    .forEach(c => safeSend(c.ws, payload));
}

/** Send a message to all teachers (e.g., when a student completes something) */
export function notifyTeachers(event: string, data: any) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  clients
    .filter(c => c.role === "teacher")
    .forEach(c => safeSend(c.ws, payload));
}

/** Broadcast to all connected clients */
export function broadcast(event: string, data: any) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  clients.forEach(c => safeSend(c.ws, payload));
}
