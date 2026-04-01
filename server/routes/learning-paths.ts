import { db } from "../../db";
import {
  learningPaths, learningPathItems, h5pContent,
  learnerProgress, classEnrollments, profiles,
} from "@shared/schema";
import { eq, asc, desc, inArray, and, sql } from "drizzle-orm";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler";
import type { RouteContext } from "./types";

const createPathSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  classId: z.string().optional(),
  items: z.array(z.object({
    contentId: z.string().min(1),
    isRequired: z.boolean().default(true),
  })),
});

const updatePathSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  classId: z.string().nullable().optional(),
  items: z.array(z.object({
    contentId: z.string().min(1),
    isRequired: z.boolean().default(true),
  })).optional(),
});

// ─── Helpers ──────────────────────────────────────────────

/** Fetch path items with content titles, ordered by orderIndex. */
async function getPathItems(pathId: string) {
  return db.select({
    id: learningPathItems.id,
    contentId: learningPathItems.contentId,
    orderIndex: learningPathItems.orderIndex,
    isRequired: learningPathItems.isRequired,
    contentTitle: h5pContent.title,
    contentType: h5pContent.type,
  })
    .from(learningPathItems)
    .innerJoin(h5pContent, eq(learningPathItems.contentId, h5pContent.id))
    .where(eq(learningPathItems.pathId, pathId))
    .orderBy(asc(learningPathItems.orderIndex));
}

/**
 * Batch-fetch learner progress for a set of contentIds and one or many userIds.
 * Returns a Map keyed by `userId:contentId` for O(1) lookup.
 */
async function batchGetProgress(
  userIds: string[],
  contentIds: string[],
): Promise<Map<string, { completionPercentage: number; completedAt: Date | null }>> {
  if (userIds.length === 0 || contentIds.length === 0) return new Map();

  const rows = await db.select({
    userId: learnerProgress.userId,
    contentId: learnerProgress.contentId,
    completionPercentage: learnerProgress.completionPercentage,
    completedAt: learnerProgress.completedAt,
  })
    .from(learnerProgress)
    .where(and(
      inArray(learnerProgress.userId, userIds),
      inArray(learnerProgress.contentId, contentIds),
    ));

  const map = new Map<string, { completionPercentage: number; completedAt: Date | null }>();
  for (const row of rows) {
    map.set(`${row.userId}:${row.contentId}`, {
      completionPercentage: row.completionPercentage,
      completedAt: row.completedAt,
    });
  }
  return map;
}

/** Check whether a student is enrolled in the class that owns a path. */
async function isStudentEnrolledInPathClass(userId: string, path: { classId: string | null }) {
  if (!path.classId) return false;
  const [enrollment] = await db.select({ id: classEnrollments.id })
    .from(classEnrollments)
    .where(and(
      eq(classEnrollments.classId, path.classId),
      eq(classEnrollments.userId, userId),
    ))
    .limit(1);
  return !!enrollment;
}

/** Check if the requesting user is an admin. */
async function isAdmin(userId: string) {
  const [user] = await db.select({ role: profiles.role })
    .from(profiles).where(eq(profiles.id, userId)).limit(1);
  return user?.role === "admin";
}

// ─── Routes ───────────────────────────────────────────────

export function registerLearningPathRoutes({ app, storage, requireAuth, requireTeacher }: RouteContext) {

  // ── Create learning path (teachers only) ────────────────
  app.post("/api/learning-paths", requireTeacher, asyncHandler(async (req: any, res) => {
    const parsed = createPathSchema.parse(req.body);
    const [path] = await db.insert(learningPaths).values({
      name: parsed.name,
      description: parsed.description || null,
      userId: req.session.userId!,
      classId: parsed.classId || null,
    }).returning();

    if (parsed.items.length > 0) {
      await db.insert(learningPathItems).values(
        parsed.items.map((item, i) => ({
          pathId: path.id,
          contentId: item.contentId,
          orderIndex: i,
          isRequired: item.isRequired,
        })),
      );
    }

    res.json(path);
  }));

  // ── List learning paths (own paths, or ALL paths for admins) ──
  app.get("/api/learning-paths", requireTeacher, asyncHandler(async (req: any, res) => {
    const admin = await isAdmin(req.session.userId!);
    const query = admin
      ? db.select().from(learningPaths)
      : db.select().from(learningPaths).where(eq(learningPaths.userId, req.session.userId!));
    const paths = await query.orderBy(desc(learningPaths.createdAt));
    res.json(paths);
  }));

  // ── Get path with items ─────────────────────────────────
  // Teachers can view their own paths; students can view paths assigned to enrolled classes.
  app.get("/api/learning-paths/:id", requireAuth, asyncHandler(async (req: any, res) => {
    const [path] = await db.select().from(learningPaths)
      .where(eq(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });

    // Authorization: owner or enrolled student
    const userId = req.session.userId!;
    if (path.userId !== userId) {
      const enrolled = await isStudentEnrolledInPathClass(userId, path);
      if (!enrolled) return res.status(403).json({ message: "Not authorized to view this path" });
    }

    const items = await getPathItems(path.id);
    res.json({ ...path, items });
  }));

  // ── Update learning path (owner or admin) ────────────────
  app.put("/api/learning-paths/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    const [path] = await db.select().from(learningPaths)
      .where(eq(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });
    if (path.userId !== req.session.userId! && !(await isAdmin(req.session.userId!))) {
      return res.status(403).json({ message: "Not authorized to update this path" });
    }

    const parsed = updatePathSchema.parse(req.body);

    // Update path metadata
    const metaUpdates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.name !== undefined) metaUpdates.name = parsed.name;
    if (parsed.description !== undefined) metaUpdates.description = parsed.description || null;
    if (parsed.classId !== undefined) metaUpdates.classId = parsed.classId;

    const [updated] = await db.update(learningPaths)
      .set(metaUpdates)
      .where(eq(learningPaths.id, path.id))
      .returning();

    // Replace items if provided
    if (parsed.items) {
      await db.delete(learningPathItems).where(eq(learningPathItems.pathId, path.id));
      if (parsed.items.length > 0) {
        await db.insert(learningPathItems).values(
          parsed.items.map((item, i) => ({
            pathId: path.id,
            contentId: item.contentId,
            orderIndex: i,
            isRequired: item.isRequired,
          })),
        );
      }
    }

    const items = await getPathItems(path.id);
    res.json({ ...updated, items });
  }));

  // ── Student: get my progress on a path ──────────────────
  // Authorization: owner or enrolled student.
  app.get("/api/learning-paths/:id/progress", requireAuth, asyncHandler(async (req: any, res) => {
    const [path] = await db.select().from(learningPaths)
      .where(eq(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });

    const userId = req.session.userId!;
    if (path.userId !== userId) {
      const enrolled = await isStudentEnrolledInPathClass(userId, path);
      if (!enrolled) return res.status(403).json({ message: "Not authorized to view this path" });
    }

    const items = await getPathItems(path.id);
    const contentIds = items.map(i => i.contentId);

    // Batch fetch instead of N+1
    const progressMap = await batchGetProgress([userId], contentIds);

    const enrichedItems = items.map(item => {
      const p = progressMap.get(`${userId}:${item.contentId}`);
      return {
        ...item,
        completionPercentage: p?.completionPercentage ?? 0,
        completedAt: p?.completedAt ?? null,
      };
    });

    const completed = enrichedItems.filter(p => p.completionPercentage >= 100).length;
    const currentIndex = enrichedItems.findIndex(p => p.completionPercentage < 100);

    res.json({
      path,
      items: enrichedItems,
      completed,
      total: items.length,
      currentIndex: currentIndex === -1 ? items.length : currentIndex,
    });
  }));

  // ── Teacher/admin: get all students' progress on a path ──
  app.get("/api/learning-paths/:id/students", requireTeacher, asyncHandler(async (req: any, res) => {
    const [path] = await db.select().from(learningPaths)
      .where(eq(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });
    if (path.userId !== req.session.userId! && !(await isAdmin(req.session.userId!))) {
      return res.status(403).json({ message: "Not authorized to view this path" });
    }
    if (!path.classId) {
      return res.json({ path, students: [], items: [] });
    }

    // Get all enrolled students
    const enrolledStudents = await db.select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
    })
      .from(classEnrollments)
      .innerJoin(profiles, eq(classEnrollments.userId, profiles.id))
      .where(eq(classEnrollments.classId, path.classId));

    // Get path items
    const items = await getPathItems(path.id);
    const contentIds = items.map(i => i.contentId);
    const studentIds = enrolledStudents.map(s => s.id);

    // Batch fetch all progress in one query
    const progressMap = await batchGetProgress(studentIds, contentIds);

    // Build per-student progress
    const students = enrolledStudents.map(student => {
      const itemProgress = items.map(item => {
        const p = progressMap.get(`${student.id}:${item.contentId}`);
        return {
          contentId: item.contentId,
          contentTitle: item.contentTitle,
          contentType: item.contentType,
          completionPercentage: p?.completionPercentage ?? 0,
          completedAt: p?.completedAt ?? null,
        };
      });

      const completedCount = itemProgress.filter(p => p.completionPercentage >= 100).length;

      return {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        completedItems: completedCount,
        totalItems: items.length,
        progressPercentage: items.length > 0
          ? Math.round((completedCount / items.length) * 100)
          : 0,
        items: itemProgress,
      };
    });

    res.json({ path, students, items });
  }));

  // ── Student: list learning paths for enrolled classes ────
  app.get("/api/student/learning-paths", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.session.userId!;

    const enrollments = await db.select({ classId: classEnrollments.classId })
      .from(classEnrollments)
      .where(eq(classEnrollments.userId, userId));

    const classIds = enrollments.map(e => e.classId);
    if (classIds.length === 0) return res.json([]);

    const paths = await db.select().from(learningPaths)
      .where(inArray(learningPaths.classId, classIds))
      .orderBy(desc(learningPaths.createdAt));

    if (paths.length === 0) return res.json([]);

    // Batch: get all items for all paths in one query
    const pathIds = paths.map(p => p.id);
    const allItems = await db.select({
      pathId: learningPathItems.pathId,
      contentId: learningPathItems.contentId,
    })
      .from(learningPathItems)
      .where(inArray(learningPathItems.pathId, pathIds));

    // Batch: get all progress for this user across all content in one query
    const allContentIds = Array.from(new Set(allItems.map(i => i.contentId)));
    const progressMap = await batchGetProgress([userId], allContentIds);

    // Group items by path
    const itemsByPath = new Map<string, string[]>();
    for (const item of allItems) {
      const list = itemsByPath.get(item.pathId) || [];
      list.push(item.contentId);
      itemsByPath.set(item.pathId, list);
    }

    const enriched = paths.map(path => {
      const contentIds = itemsByPath.get(path.id) || [];
      const completedCount = contentIds.filter(cid => {
        const p = progressMap.get(`${userId}:${cid}`);
        return p && p.completionPercentage >= 100;
      }).length;

      return {
        id: path.id,
        name: path.name,
        description: path.description,
        totalItems: contentIds.length,
        completedItems: completedCount,
        progressPercentage: contentIds.length > 0
          ? Math.round((completedCount / contentIds.length) * 100)
          : 0,
      };
    });

    res.json(enriched);
  }));

  // ── Delete learning path (owner or admin) ────────────────
  app.delete("/api/learning-paths/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    const [path] = await db.select().from(learningPaths)
      .where(eq(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });
    if (path.userId !== req.session.userId! && !(await isAdmin(req.session.userId!))) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await db.delete(learningPaths).where(eq(learningPaths.id, req.params.id));
    res.json({ message: "Learning path deleted" });
  }));
}
