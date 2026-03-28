import { db } from "../../db";
import { notifications } from "@shared/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

export class NotificationService {
  async create(
    userId: string,
    type: string,
    title: string,
    body?: string,
    linkUrl?: string,
  ) {
    const [notification] = await db
      .insert(notifications)
      .values({ userId, type, title, body, linkUrl })
      .returning();
    return notification;
  }

  async getForUser(userId: string, limit = 50) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );
    return result?.value ?? 0;
  }

  async markAsRead(notificationId: string, userId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );
  }

  async createAssignmentNotification(
    studentIds: string[],
    contentTitle: string,
    className: string,
    dueDate?: Date | null,
  ) {
    if (studentIds.length === 0) return;

    const duePart = dueDate
      ? ` Due ${dueDate.toLocaleDateString()}.`
      : "";
    const body = `New assignment "${contentTitle}" has been posted in ${className}.${duePart}`;

    const rows = studentIds.map((userId) => ({
      userId,
      type: "new_assignment",
      title: `New Assignment: ${contentTitle}`,
      body,
    }));

    await db.insert(notifications).values(rows);
  }

  async createDueReminder(
    studentIds: string[],
    contentTitle: string,
    className: string,
    dueDate: Date,
  ) {
    if (studentIds.length === 0) return;

    const body = `"${contentTitle}" in ${className} is due ${dueDate.toLocaleDateString()}. Don't forget to submit!`;

    const rows = studentIds.map((userId) => ({
      userId,
      type: "due_reminder",
      title: `Due Soon: ${contentTitle}`,
      body,
    }));

    await db.insert(notifications).values(rows);
  }

  async createGradeNotification(
    userId: string,
    contentTitle: string,
    score: number,
    total: number,
  ) {
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const body = `You scored ${score}/${total} (${percentage}%) on "${contentTitle}".`;

    return this.create(
      userId,
      "grade_posted",
      `Grade Posted: ${contentTitle}`,
      body,
    );
  }
}
