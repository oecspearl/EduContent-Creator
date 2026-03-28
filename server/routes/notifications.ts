import { NotificationService } from "../services/notification-service";
import type { RouteContext } from "./types";

export function registerNotificationRoutes({ app, requireAuth }: RouteContext) {
  const notifSvc = new NotificationService();

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await notifSvc.getForUser(req.session.userId!, limit);
      res.json(notifications);
    } catch (error: any) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread count
  app.get("/api/notifications/unread-count", requireAuth, async (req: any, res) => {
    try {
      const count = await notifSvc.getUnreadCount(req.session.userId!);
      res.json({ count });
    } catch (error: any) {
      console.error("Get unread count error:", error);
      res.json({ count: 0 });
    }
  });

  // Mark one as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req: any, res) => {
    try {
      await notifSvc.markAsRead(req.params.id, req.session.userId!);
      res.json({ message: "Marked as read" });
    } catch (error: any) {
      console.error("Mark as read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req: any, res) => {
    try {
      await notifSvc.markAllAsRead(req.session.userId!);
      res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
      console.error("Mark all as read error:", error);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });
}
