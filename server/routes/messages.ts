import { db } from "../../db";
import { messages, profiles } from "@shared/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { z } from "zod";
import { NotificationService } from "../services/notification-service";
import type { RouteContext } from "./types";

const sendMessageSchema = z.object({
  toUserId: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  contentId: z.string().optional(),
});

export function registerMessageRoutes({ app, storage, requireAuth }: RouteContext) {
  const notifSvc = new NotificationService();

  // Send a message
  app.post("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const parsed = sendMessageSchema.parse(req.body);
      const fromUserId = req.session.userId!;

      // Verify recipient exists
      const recipient = await storage.getProfileById(parsed.toUserId);
      if (!recipient) return res.status(404).json({ message: "Recipient not found" });

      const [message] = await db.insert(messages).values({
        fromUserId,
        toUserId: parsed.toUserId,
        subject: parsed.subject || null,
        body: parsed.body,
        contentId: parsed.contentId || null,
      }).returning();

      // Send notification to recipient
      const sender = await storage.getProfileById(fromUserId);
      await notifSvc.create(
        parsed.toUserId,
        "message",
        `New message from ${sender?.fullName || "Unknown"}`,
        parsed.subject || parsed.body.slice(0, 100),
        "/messages",
      );

      res.json(message);
    } catch (error: any) {
      console.error("Send message error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid message data" });
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get conversations (inbox)
  app.get("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;

      const allMessages = await db.select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        body: messages.body,
        contentId: messages.contentId,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        fromName: profiles.fullName,
      })
        .from(messages)
        .leftJoin(profiles, eq(messages.fromUserId, profiles.id))
        .where(or(eq(messages.fromUserId, userId), eq(messages.toUserId, userId)))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      res.json(allMessages);
    } catch (error: any) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Mark message as read
  app.patch("/api/messages/:id/read", requireAuth, async (req: any, res) => {
    try {
      await db.update(messages)
        .set({ isRead: true })
        .where(and(eq(messages.id, req.params.id), eq(messages.toUserId, req.session.userId!)));
      res.json({ message: "Marked as read" });
    } catch (error: any) {
      console.error("Mark message read error:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });
}
