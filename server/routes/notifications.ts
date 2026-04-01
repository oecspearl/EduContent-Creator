import { NotificationService } from "../services/notification-service";
import type { RouteContext } from "./types";
import { asyncHandler } from "../utils/async-handler";

export function registerNotificationRoutes({ app, requireAuth }: RouteContext) {
  const notifSvc = new NotificationService();

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, asyncHandler(async (req: any, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await notifSvc.getForUser(req.session.userId!, limit);
    res.json(notifications);
  }));

  // Get unread count
  app.get("/api/notifications/unread-count", requireAuth, asyncHandler(async (req: any, res) => {
    const count = await notifSvc.getUnreadCount(req.session.userId!);
    res.json({ count });
  }));

  // Mark one as read
  app.patch("/api/notifications/:id/read", requireAuth, asyncHandler(async (req: any, res) => {
    await notifSvc.markAsRead(req.params.id, req.session.userId!);
    res.json({ message: "Marked as read" });
  }));

  // Mark all as read
  app.post("/api/notifications/mark-all-read", requireAuth, asyncHandler(async (req: any, res) => {
    await notifSvc.markAllAsRead(req.session.userId!);
    res.json({ message: "All notifications marked as read" });
  }));
}
