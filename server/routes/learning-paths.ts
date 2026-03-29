import { db } from "../../db";
import { learningPaths, learningPathItems, h5pContent, learnerProgress, classEnrollments } from "@shared/schema";
import { eq, asc, desc, inArray } from "drizzle-orm";
import { z } from "zod";
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

export function registerLearningPathRoutes({ app, storage, requireAuth, requireTeacher }: RouteContext) {
  // Create learning path (teachers only)
  app.post("/api/learning-paths", requireTeacher, async (req: any, res) => {
    try {
      const parsed = createPathSchema.parse(req.body);
      const [path] = await db.insert(learningPaths).values({
        name: parsed.name,
        description: parsed.description || null,
        userId: req.session.userId!,
        classId: parsed.classId || null,
      }).returning();

      // Insert items with order
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
    } catch (error: any) {
      console.error("Create learning path error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid data" });
      res.status(500).json({ message: "Failed to create learning path" });
    }
  });

  // List teacher's learning paths
  app.get("/api/learning-paths", requireTeacher, async (req: any, res) => {
    try {
      const paths = await db.select().from(learningPaths)
        .where(eq(learningPaths.userId, req.session.userId!))
        .orderBy(desc(learningPaths.createdAt));
      res.json(paths);
    } catch (error: any) {
      console.error("Get learning paths error:", error);
      res.status(500).json({ message: "Failed to fetch learning paths" });
    }
  });

  // Get path with items
  app.get("/api/learning-paths/:id", requireAuth, async (req: any, res) => {
    try {
      const [path] = await db.select().from(learningPaths)
        .where(eq(learningPaths.id, req.params.id)).limit(1);
      if (!path) return res.status(404).json({ message: "Path not found" });

      const items = await db.select({
        id: learningPathItems.id,
        contentId: learningPathItems.contentId,
        orderIndex: learningPathItems.orderIndex,
        isRequired: learningPathItems.isRequired,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
      })
        .from(learningPathItems)
        .innerJoin(h5pContent, eq(learningPathItems.contentId, h5pContent.id))
        .where(eq(learningPathItems.pathId, path.id))
        .orderBy(asc(learningPathItems.orderIndex));

      res.json({ ...path, items });
    } catch (error: any) {
      console.error("Get learning path error:", error);
      res.status(500).json({ message: "Failed to fetch learning path" });
    }
  });

  // Student: get path progress
  app.get("/api/learning-paths/:id/progress", requireAuth, async (req: any, res) => {
    try {
      const [path] = await db.select().from(learningPaths)
        .where(eq(learningPaths.id, req.params.id)).limit(1);
      if (!path) return res.status(404).json({ message: "Path not found" });

      const items = await db.select({
        contentId: learningPathItems.contentId,
        orderIndex: learningPathItems.orderIndex,
        isRequired: learningPathItems.isRequired,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
      })
        .from(learningPathItems)
        .innerJoin(h5pContent, eq(learningPathItems.contentId, h5pContent.id))
        .where(eq(learningPathItems.pathId, path.id))
        .orderBy(asc(learningPathItems.orderIndex));

      const userId = req.session.userId!;
      const progress = await Promise.all(
        items.map(async (item) => {
          const p = await storage.getLearnerProgress(userId, item.contentId);
          return {
            ...item,
            completionPercentage: p?.completionPercentage ?? 0,
            completedAt: p?.completedAt ?? null,
          };
        }),
      );

      const completed = progress.filter(p => p.completionPercentage >= 100).length;
      const currentIndex = progress.findIndex(p => p.completionPercentage < 100);

      res.json({
        path,
        items: progress,
        completed,
        total: items.length,
        currentIndex: currentIndex === -1 ? items.length : currentIndex,
      });
    } catch (error: any) {
      console.error("Get path progress error:", error);
      res.status(500).json({ message: "Failed to fetch path progress" });
    }
  });

  // Student: list learning paths for my enrolled classes
  app.get("/api/student/learning-paths", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId!;

      // Get all class IDs the student is enrolled in
      const enrollments = await db.select({ classId: classEnrollments.classId })
        .from(classEnrollments)
        .where(eq(classEnrollments.userId, userId));

      const classIds = enrollments.map(e => e.classId);
      if (classIds.length === 0) return res.json([]);

      // Get learning paths assigned to those classes
      const paths = await db.select().from(learningPaths)
        .where(inArray(learningPaths.classId, classIds))
        .orderBy(desc(learningPaths.createdAt));

      // Enrich each path with item count and student's progress
      const enriched = await Promise.all(
        paths.map(async (path) => {
          const items = await db.select({ contentId: learningPathItems.contentId })
            .from(learningPathItems)
            .where(eq(learningPathItems.pathId, path.id));

          let completedCount = 0;
          for (const item of items) {
            const p = await storage.getLearnerProgress(userId, item.contentId);
            if (p && p.completionPercentage >= 100) completedCount++;
          }

          return {
            id: path.id,
            name: path.name,
            description: path.description,
            totalItems: items.length,
            completedItems: completedCount,
            progressPercentage: items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0,
          };
        }),
      );

      res.json(enriched);
    } catch (error: any) {
      console.error("Student learning paths error:", error);
      res.status(500).json({ message: "Failed to fetch learning paths" });
    }
  });

  // Delete learning path
  app.delete("/api/learning-paths/:id", requireTeacher, async (req: any, res) => {
    try {
      const [path] = await db.select().from(learningPaths)
        .where(eq(learningPaths.id, req.params.id)).limit(1);
      if (!path || path.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await db.delete(learningPaths).where(eq(learningPaths.id, req.params.id));
      res.json({ message: "Learning path deleted" });
    } catch (error: any) {
      console.error("Delete learning path error:", error);
      res.status(500).json({ message: "Failed to delete learning path" });
    }
  });
}
