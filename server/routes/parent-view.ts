import { db } from "../../db";
import { profiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import type { RouteContext } from "./types";

export function registerParentViewRoutes({ app, storage, requireAuth }: RouteContext) {
  // Generate parent share token for a student
  app.post("/api/student/parent-link", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getProfileById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Generate a secure token
      const token = crypto.randomBytes(32).toString("hex");
      await db.update(profiles)
        .set({ parentShareToken: token })
        .where(eq(profiles.id, userId));

      res.json({ token });
    } catch (error: any) {
      console.error("Generate parent link error:", error);
      res.status(500).json({ message: "Failed to generate parent link" });
    }
  });

  // Parent view — no auth required, uses token
  app.get("/api/parent-view/:token", async (req, res) => {
    try {
      const token = req.params.token;
      if (!token || token.length < 32) return res.status(400).json({ message: "Invalid token" });

      const [student] = await db.select()
        .from(profiles)
        .where(eq(profiles.parentShareToken, token))
        .limit(1);

      if (!student) return res.status(404).json({ message: "Invalid or expired link" });

      // Get student's progress and scores
      const assignments = await storage.getStudentAssignments(student.id);
      const allProgress = await storage.getAllUserProgress(student.id);
      const classes = await storage.getStudentClasses(student.id);

      // Get quiz scores
      const scores: any[] = [];
      const contentIds = Array.from(new Set(assignments.map((a: any) => a.contentId)));
      for (const contentId of contentIds) {
        const attempts = await storage.getQuizAttempts(student.id, contentId);
        if (attempts.length > 0) {
          const assignment = assignments.find((a: any) => a.contentId === contentId);
          const best = attempts.reduce((b, a) =>
            (a.score / a.totalQuestions) > (b.score / b.totalQuestions) ? a : b
          );
          scores.push({
            contentTitle: (assignment as any)?.contentTitle ?? "Unknown",
            className: (assignment as any)?.className ?? "",
            bestPercentage: Math.round((best.score / best.totalQuestions) * 100),
            bestScore: best.score,
            bestTotal: best.totalQuestions,
          });
        }
      }

      const totalAssignments = assignments.length;
      const completedAssignments = allProgress.filter(p => p.completionPercentage >= 100).length;
      const avgCompletion = allProgress.length > 0
        ? Math.round(allProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / allProgress.length)
        : 0;

      res.json({
        studentName: student.fullName,
        totalClasses: classes.length,
        totalAssignments,
        completedAssignments,
        avgCompletion,
        scores,
      });
    } catch (error: any) {
      console.error("Parent view error:", error);
      res.status(500).json({ message: "Failed to load student data" });
    }
  });
}
