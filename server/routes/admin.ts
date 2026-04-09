import { asyncHandler } from "../utils/async-handler";
import { db } from "../../db";
import { profiles, h5pContent, quizAttempts, learnerProgress, classes, classEnrollments, auditLog } from "@shared/schema";
import { eq, desc, sql, count, and, gte, lte } from "drizzle-orm";
import type { RouteContext } from "./types";

export function registerAdminRoutes({ app, requireAdmin }: RouteContext) {

  // ─── Dashboard overview stats ────────────────────────────
  app.get("/api/admin/stats", requireAdmin, asyncHandler(async (_req, res) => {
    const [[userStats], [contentStats], [classStats], [quizStats]] = await Promise.all([
      db.select({
        total: count(),
        teachers: count(sql`CASE WHEN ${profiles.role} = 'teacher' THEN 1 END`),
        students: count(sql`CASE WHEN ${profiles.role} = 'student' THEN 1 END`),
        admins: count(sql`CASE WHEN ${profiles.role} = 'admin' THEN 1 END`),
      }).from(profiles),

      db.select({
        total: count(),
        published: count(sql`CASE WHEN ${h5pContent.isPublished} = true THEN 1 END`),
        public: count(sql`CASE WHEN ${h5pContent.isPublic} = true THEN 1 END`),
      }).from(h5pContent),

      db.select({ total: count() }).from(classes),

      db.select({
        total: count(),
        avgScore: sql<number>`COALESCE(ROUND(AVG(${quizAttempts.score}::decimal / NULLIF(${quizAttempts.totalQuestions}, 0) * 100), 1), 0)`,
      }).from(quizAttempts),
    ]);

    res.json({
      users: userStats,
      content: contentStats,
      classes: classStats,
      quizzes: quizStats,
    });
  }));

  // ─── Content by type breakdown ───────────────────────────
  app.get("/api/admin/content-by-type", requireAdmin, asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        type: h5pContent.type,
        count: count(),
      })
      .from(h5pContent)
      .groupBy(h5pContent.type)
      .orderBy(desc(count()));

    res.json(rows);
  }));

  // ─── All content with creator info ───────────────────────
  app.get("/api/admin/content", requireAdmin, asyncHandler(async (req: any, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const typeFilter = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;

    const conditions = [];
    if (typeFilter && typeFilter !== "all") {
      conditions.push(eq(h5pContent.type, typeFilter));
    }
    if (search) {
      conditions.push(sql`LOWER(${h5pContent.title}) LIKE LOWER(${'%' + search + '%'})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: h5pContent.id,
          title: h5pContent.title,
          description: h5pContent.description,
          type: h5pContent.type,
          isPublished: h5pContent.isPublished,
          isPublic: h5pContent.isPublic,
          subject: h5pContent.subject,
          gradeLevel: h5pContent.gradeLevel,
          tags: h5pContent.tags,
          createdAt: h5pContent.createdAt,
          updatedAt: h5pContent.updatedAt,
          creatorId: profiles.id,
          creatorName: profiles.fullName,
          creatorEmail: profiles.email,
        })
        .from(h5pContent)
        .leftJoin(profiles, eq(h5pContent.userId, profiles.id))
        .where(whereClause)
        .orderBy(desc(h5pContent.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(h5pContent).where(whereClause),
    ]);

    res.json({
      items: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  // ─── All users ───────────────────────────────────────────
  app.get("/api/admin/users", requireAdmin, asyncHandler(async (req: any, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const roleFilter = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    const conditions = [];
    if (roleFilter && roleFilter !== "all") {
      conditions.push(eq(profiles.role, roleFilter));
    }
    if (search) {
      conditions.push(
        sql`(LOWER(${profiles.fullName}) LIKE LOWER(${'%' + search + '%'}) OR LOWER(${profiles.email}) LIKE LOWER(${'%' + search + '%'}))`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: profiles.id,
          email: profiles.email,
          fullName: profiles.fullName,
          role: profiles.role,
          institution: profiles.institution,
          authProvider: profiles.authProvider,
          createdAt: profiles.createdAt,
        })
        .from(profiles)
        .where(whereClause)
        .orderBy(desc(profiles.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(profiles).where(whereClause),
    ]);

    // Fetch content counts per user in one query
    const userIds = rows.map(r => r.id);
    const contentCounts = userIds.length > 0
      ? await db
          .select({
            userId: h5pContent.userId,
            count: count(),
          })
          .from(h5pContent)
          .where(sql`${h5pContent.userId} = ANY(${userIds})`)
          .groupBy(h5pContent.userId)
      : [];

    const countMap = new Map(contentCounts.map(c => [c.userId, c.count]));

    const usersWithCounts = rows.map(u => ({
      ...u,
      contentCount: countMap.get(u.id) || 0,
    }));

    res.json({
      items: usersWithCounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  // ─── Recent activity (audit log) ─────────────────────────
  app.get("/api/admin/activity", requireAdmin, asyncHandler(async (req: any, res) => {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const rows = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        metadata: auditLog.metadata,
        createdAt: auditLog.createdAt,
        userName: profiles.fullName,
        userEmail: profiles.email,
      })
      .from(auditLog)
      .leftJoin(profiles, eq(auditLog.userId, profiles.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    res.json(rows);
  }));

  // ─── Content creation over time (last 30 days) ──────────
  app.get("/api/admin/content-timeline", requireAdmin, asyncHandler(async (_req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await db
      .select({
        date: sql<string>`DATE(${h5pContent.createdAt})`,
        count: count(),
      })
      .from(h5pContent)
      .where(gte(h5pContent.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${h5pContent.createdAt})`)
      .orderBy(sql`DATE(${h5pContent.createdAt})`);

    res.json(rows);
  }));

  // ─── Admin: delete any content ───────────────────────────
  app.delete("/api/admin/content/:id", requireAdmin, asyncHandler(async (req: any, res) => {
    const contentId = req.params.id;
    const content = await db.select().from(h5pContent).where(eq(h5pContent.id, contentId)).limit(1);
    if (content.length === 0) {
      return res.status(404).json({ message: "Content not found" });
    }

    await db.delete(h5pContent).where(eq(h5pContent.id, contentId));

    // Log the action
    await db.insert(auditLog).values({
      userId: req.session.userId,
      action: "admin_content_deleted",
      entityType: "content",
      entityId: contentId,
      metadata: { title: content[0].title, type: content[0].type },
    });

    res.json({ message: "Content deleted" });
  }));

  // ─── Admin: update user role ─────────────────────────────
  app.patch("/api/admin/users/:id/role", requireAdmin, asyncHandler(async (req: any, res) => {
    const userId = req.params.id;
    const { role } = req.body;

    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Prevent admin from demoting themselves
    if (userId === req.session.userId) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    const updated = await db
      .update(profiles)
      .set({ role, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.insert(auditLog).values({
      userId: req.session.userId,
      action: "admin_role_changed",
      entityType: "user",
      entityId: userId,
      metadata: { newRole: role, userName: updated[0].fullName },
    });

    res.json({ message: "Role updated", user: { id: updated[0].id, role: updated[0].role } });
  }));
}
