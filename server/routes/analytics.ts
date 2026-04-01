import {
  insertLearnerProgressSchema,
  insertQuizAttemptSchema,
  insertInteractionEventSchema,
} from "@shared/schema";
import { ContentService } from "../services/content-service";
import { AuditService } from "../services/audit-service";
import { NotificationService } from "../services/notification-service";
import { callOpenAIJSON } from "../utils/openai-helper";
import { aiGenerationRateLimit } from "../middleware/rate-limit";
import { notifyTeachers } from "../websocket";
import { asyncHandler } from "../utils/async-handler";
import type { RouteContext } from "./types";

export function registerAnalyticsRoutes({ app, storage, requireAuth, requireTeacher }: RouteContext) {
  const contentSvc = new ContentService(storage);
  const auditSvc = new AuditService();
  const notifSvc = new NotificationService();

  // Progress tracking
  app.post("/api/progress", requireAuth, asyncHandler(async (req: any, res) => {
    try {
      const parsed = insertLearnerProgressSchema.parse({
        ...req.body,
        userId: req.session.userId!,
        completedAt: req.body.completedAt
          ? new Date(req.body.completedAt)
          : req.body.completionPercentage >= 100
            ? new Date()
            : null,
        lastAccessedAt: new Date(),
      });
      const progress = await storage.upsertLearnerProgress(parsed);
      res.json(progress);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));

  app.get("/api/progress/:contentId", requireAuth, asyncHandler(async (req: any, res) => {
    const progress = await storage.getLearnerProgress(req.session.userId!, req.params.contentId);
    res.json(progress || null);
  }));

  app.get("/api/progress", requireAuth, asyncHandler(async (req: any, res) => {
    const progress = await storage.getAllUserProgress(req.session.userId!);
    res.json(progress);
  }));

  // Quiz attempts
  app.post("/api/quiz-attempts", requireAuth, asyncHandler(async (req: any, res) => {
    try {
      const parsed = insertQuizAttemptSchema.parse({ ...req.body, userId: req.session.userId! });
      const attempt = await storage.createQuizAttempt(parsed);

      // Audit log + real-time notification to teacher
      const content = await storage.getContentById(parsed.contentId);
      const student = await storage.getProfileById(req.session.userId!);
      const pct = Math.round((parsed.score / parsed.totalQuestions) * 100);

      auditSvc.log({
        userId: req.session.userId!,
        action: "quiz_completed",
        entityType: "content",
        entityId: parsed.contentId,
        metadata: { score: parsed.score, total: parsed.totalQuestions, percentage: pct },
      });

      if (content && student) {
        notifyTeachers("quiz_completed", {
          studentName: student.fullName,
          contentTitle: content.title,
          contentId: content.id,
          score: parsed.score,
          total: parsed.totalQuestions,
          percentage: pct,
        });

        // Notify student of their grade
        notifSvc.createGradeNotification(
          req.session.userId!,
          content.title,
          parsed.score,
          parsed.totalQuestions,
        );
      }

      res.json(attempt);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));

  app.get("/api/quiz-attempts/:contentId", requireAuth, asyncHandler(async (req: any, res) => {
    const attempts = await storage.getQuizAttempts(req.session.userId!, req.params.contentId);
    res.json(attempts);
  }));

  // Interaction events
  app.post("/api/interaction-events", requireAuth, asyncHandler(async (req: any, res) => {
    try {
      const parsed = insertInteractionEventSchema.parse({ ...req.body, userId: req.session.userId! });
      const event = await storage.createInteractionEvent(parsed);
      res.json(event);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));

  app.get("/api/interaction-events/:contentId", requireAuth, asyncHandler(async (req: any, res) => {
    const events = await storage.getInteractionEvents(req.session.userId!, req.params.contentId);
    res.json(events);
  }));

  // Recent student activity
  app.get("/api/dashboard/recent-activity", requireAuth, asyncHandler(async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await (storage as any).getRecentStudentActivity(req.session.userId!, limit);
      res.json(activity);
    } catch (error: any) {
      res.json([]);
    }
  }));

  // Analytics overview
  app.get("/api/analytics/overview", requireAuth, asyncHandler(async (req: any, res) => {
    try {
      const analytics = await storage.getUserContentAnalytics(req.session.userId!);
      res.json(analytics);
    } catch (error: any) {
      res.json([]);
    }
  }));

  // Content-specific analytics — all routes verify ownership via ContentService
  app.get("/api/analytics/content/:contentId", requireAuth, asyncHandler(async (req: any, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId!);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage.getContentAnalytics(req.params.contentId));
  }));

  app.get("/api/analytics/content/:contentId/learners", requireAuth, asyncHandler(async (req: any, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId!);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage.getContentLearners(req.params.contentId));
  }));

  app.get("/api/analytics/content/:contentId/questions", requireAuth, asyncHandler(async (req: any, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId!);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage.getQuestionAnalytics(req.params.contentId));
  }));

  app.get("/api/analytics/content/:contentId/performance", requireAuth, asyncHandler(async (req: any, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId!);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage.getStudentPerformanceDistribution(req.params.contentId));
  }));

  app.get("/api/analytics/content/:contentId/score-distribution", requireAuth, asyncHandler(async (req: any, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId!);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage.getScoreDistribution(req.params.contentId));
  }));

  // CSV export
  app.get("/api/analytics/content/:contentId/export/csv", requireAuth, asyncHandler(async (req: any, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId!);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const attempts = await storage.getAllQuizAttemptsForContent(req.params.contentId);
    const userIds = Array.from(new Set(attempts.map((a) => a.userId)));
    const userProfiles = userIds.length > 0 ? await Promise.all(userIds.map((id) => storage.getProfileById(id))) : [];
    const userMap = userProfiles.reduce(
      (acc, profile) => {
        if (profile) acc[profile.id] = profile;
        return acc;
      },
      {} as Record<string, any>,
    );

    const headers = ["Student Name", "Email", "Score", "Total Questions", "Percentage", "Completed At"];
    const rows = attempts.map((attempt) => {
      const user = userMap[attempt.userId];
      return [
        user?.fullName || "Unknown",
        user?.email || "Unknown",
        attempt.score.toString(),
        attempt.totalQuestions.toString(),
        ((attempt.score / attempt.totalQuestions) * 100).toFixed(1),
        new Date(attempt.completedAt).toISOString(),
      ];
    });

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="quiz-results-${req.params.contentId}.csv"`);
    res.send(csv);
  }));

  // ─── Gradebook ────────────────────────────────────────────

  // Get gradebook for a class — matrix of students × assignments with best scores
  app.get("/api/gradebook/:classId", requireTeacher, asyncHandler(async (req: any, res) => {
    const classId = req.params.classId;

    // Verify teacher owns this class
    const class_ = await storage.getClassById(classId);
    if (!class_ || class_.userId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized to view this class" });
    }

    // Get enrollments, assignments, and all quiz attempts in parallel
    const [enrollments, assignments] = await Promise.all([
      storage.getClassEnrollments(classId),
      storage.getClassAssignments(classId),
    ]);

    const students = enrollments.filter((e: any) => e.role === "student");

    // For each assignment, get all quiz attempts and progress
    const assignmentData = await Promise.all(
      assignments.map(async (a: any) => {
        const allAttempts = await storage.getAllQuizAttemptsForContent(a.contentId);
        const allProgress = await storage.getUserProgressByContentId(a.contentId);
        return {
          contentId: a.contentId,
          contentTitle: a.contentTitle,
          contentType: a.contentType,
          dueDate: a.dueDate,
          attempts: allAttempts,
          progress: allProgress,
        };
      }),
    );

    // Build student rows
    const studentRows = students.map((student: any) => {
      const grades: Record<string, {
        bestScore: number | null;
        bestTotal: number | null;
        bestPercentage: number | null;
        attempts: number;
        completionPercentage: number;
        completedAt: string | null;
      }> = {};

      let totalPercentage = 0;
      let gradedCount = 0;

      for (const assignment of assignmentData) {
        const studentAttempts = assignment.attempts.filter(a => a.userId === student.userId);
        const studentProgress = assignment.progress.find(p => p.userId === student.userId);

        if (studentAttempts.length > 0) {
          const best = studentAttempts.reduce((b, a) =>
            (a.score / a.totalQuestions) > (b.score / b.totalQuestions) ? a : b
          );
          const pct = Math.round((best.score / best.totalQuestions) * 100);
          grades[assignment.contentId] = {
            bestScore: best.score,
            bestTotal: best.totalQuestions,
            bestPercentage: pct,
            attempts: studentAttempts.length,
            completionPercentage: studentProgress?.completionPercentage ?? 0,
            completedAt: studentProgress?.completedAt?.toISOString() ?? null,
          };
          totalPercentage += pct;
          gradedCount++;
        } else {
          grades[assignment.contentId] = {
            bestScore: null,
            bestTotal: null,
            bestPercentage: null,
            attempts: 0,
            completionPercentage: studentProgress?.completionPercentage ?? 0,
            completedAt: studentProgress?.completedAt?.toISOString() ?? null,
          };
        }
      }

      return {
        userId: student.userId,
        fullName: student.fullName,
        email: student.email,
        grades,
        averageScore: gradedCount > 0 ? Math.round(totalPercentage / gradedCount) : null,
        totalAttempted: gradedCount,
        totalAssignments: assignmentData.length,
      };
    });

    // Class-level stats
    const classAverage = studentRows.filter(s => s.averageScore !== null).length > 0
      ? Math.round(
          studentRows
            .filter(s => s.averageScore !== null)
            .reduce((sum, s) => sum + s.averageScore!, 0)
          / studentRows.filter(s => s.averageScore !== null).length
        )
      : null;

    res.json({
      classId,
      className: class_.name,
      classSubject: class_.subject,
      classGradeLevel: class_.gradeLevel,
      assignments: assignmentData.map(a => ({
        contentId: a.contentId,
        contentTitle: a.contentTitle,
        contentType: a.contentType,
        dueDate: a.dueDate,
      })),
      students: studentRows,
      classAverage,
      totalStudents: studentRows.length,
      totalAssignments: assignmentData.length,
    });
  }));

  // CSV export for entire gradebook
  app.get("/api/gradebook/:classId/export/csv", requireTeacher, asyncHandler(async (req: any, res) => {
    const classId = req.params.classId;
    const class_ = await storage.getClassById(classId);
    if (!class_ || class_.userId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Reuse gradebook logic by calling the same data
    const [enrollments, assignments] = await Promise.all([
      storage.getClassEnrollments(classId),
      storage.getClassAssignments(classId),
    ]);

    const students = enrollments.filter((e: any) => e.role === "student");
    const assignmentData = await Promise.all(
      assignments.map(async (a: any) => {
        const attempts = await storage.getAllQuizAttemptsForContent(a.contentId);
        return { contentId: a.contentId, contentTitle: a.contentTitle, attempts };
      }),
    );

    // Build CSV
    const headers = [
      "Student Name",
      "Email",
      ...assignmentData.map(a => a.contentTitle),
      "Average",
    ];

    const rows = students.map((student: any) => {
      const scores: string[] = [];
      let total = 0;
      let graded = 0;

      for (const assignment of assignmentData) {
        const studentAttempts = assignment.attempts.filter(a => a.userId === student.userId);
        if (studentAttempts.length > 0) {
          const best = studentAttempts.reduce((b, a) =>
            (a.score / a.totalQuestions) > (b.score / b.totalQuestions) ? a : b
          );
          const pct = Math.round((best.score / best.totalQuestions) * 100);
          scores.push(`${pct}%`);
          total += pct;
          graded++;
        } else {
          scores.push("\u2014");
        }
      }

      const avg = graded > 0 ? `${Math.round(total / graded)}%` : "\u2014";
      return [student.fullName, student.email, ...scores, avg];
    });

    const csv = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="gradebook-${class_.name.replace(/[^a-zA-Z0-9]/g, "-")}.csv"`);
    res.send(csv);
  }));

  // JSON export
  app.get("/api/analytics/content/:contentId/export/json", requireAuth, asyncHandler(async (req: any, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId!);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const content = check.data;
    const attempts = await storage.getAllQuizAttemptsForContent(req.params.contentId);
    const userIds = Array.from(new Set(attempts.map((a) => a.userId)));
    const userProfiles = userIds.length > 0 ? await Promise.all(userIds.map((id) => storage.getProfileById(id))) : [];
    const userMap = userProfiles.reduce(
      (acc, profile) => {
        if (profile) acc[profile.id] = profile;
        return acc;
      },
      {} as Record<string, any>,
    );

    const exportData = {
      contentId: content.id,
      contentTitle: content.title,
      exportDate: new Date().toISOString(),
      totalAttempts: attempts.length,
      attempts: attempts.map((attempt) => {
        const user = userMap[attempt.userId];
        return {
          attemptId: attempt.id,
          studentName: user?.fullName || "Unknown",
          studentEmail: user?.email || "Unknown",
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          percentage: Math.round((attempt.score / attempt.totalQuestions) * 100 * 10) / 10,
          completedAt: attempt.completedAt,
          answers: attempt.answers,
        };
      }),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="quiz-results-${req.params.contentId}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  }));

  // Interaction analytics for non-quiz content (flashcards, memory game, video, etc.)
  app.get("/api/analytics/content/:contentId/interactions", requireAuth, asyncHandler(async (req: any, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId!);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const events = await storage.getInteractionEvents("", req.params.contentId);
    // Note: getInteractionEvents requires userId, we need all events
    // Use the analytics repository's method instead
    const allProgress = await storage.getUserProgressByContentId(req.params.contentId);
    const learners = await storage.getContentLearners(req.params.contentId);

    // Aggregate event types
    const eventCounts: Record<string, number> = {};
    // We'll use the learner data which already has totalInteractions

    const summary = {
      totalLearners: learners.length,
      avgCompletion: learners.length > 0
        ? Math.round(learners.reduce((s: number, l: any) => s + l.completionPercentage, 0) / learners.length)
        : 0,
      totalInteractions: learners.reduce((s: number, l: any) => s + l.totalInteractions, 0),
      completedCount: allProgress.filter(p => p.completionPercentage >= 100).length,
      learners: learners.map((l: any) => ({
        name: l.displayName,
        email: l.email,
        completion: l.completionPercentage,
        interactions: l.totalInteractions,
        lastAccessed: l.lastAccessedAt,
      })),
    };

    res.json(summary);
  }));

  // AI-generated progress report for a student in a class
  app.post("/api/gradebook/:classId/report/:studentId", requireTeacher, aiGenerationRateLimit, asyncHandler(async (req: any, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "AI features are not configured." });
    }

    const { classId, studentId } = req.params;

    const class_ = await storage.getClassById(classId);
    if (!class_ || class_.userId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const student = await storage.getProfileById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const assignments = await storage.getClassAssignments(classId);
    const scoreData: string[] = [];

    for (const a of assignments) {
      const attempts = await storage.getAllQuizAttemptsForContent((a as any).contentId);
      const studentAttempts = attempts.filter(att => att.userId === studentId);
      const progress = await storage.getLearnerProgress(studentId, (a as any).contentId);

      if (studentAttempts.length > 0) {
        const best = studentAttempts.reduce((b, att) =>
          (att.score / att.totalQuestions) > (b.score / b.totalQuestions) ? att : b
        );
        const pct = Math.round((best.score / best.totalQuestions) * 100);
        scoreData.push(`- "${(a as any).contentTitle}" (${(a as any).contentType}): ${pct}% (${best.score}/${best.totalQuestions}), ${studentAttempts.length} attempts`);
      } else if (progress) {
        scoreData.push(`- "${(a as any).contentTitle}" (${(a as any).contentType}): ${Math.round(progress.completionPercentage)}% completion, no quiz score`);
      } else {
        scoreData.push(`- "${(a as any).contentTitle}" (${(a as any).contentType}): Not started`);
      }
    }

    const prompt = `Generate a progress report for a student.

Student: ${student.fullName}
Class: ${class_.name}${class_.subject ? ` (${class_.subject})` : ""}${class_.gradeLevel ? `, ${class_.gradeLevel}` : ""}

Performance on assignments:
${scoreData.join("\n")}

Write a professional but warm progress report (3-4 paragraphs) that a teacher could send to parents. Include:
1. Overall assessment of the student's performance
2. Specific strengths based on high scores
3. Areas needing improvement based on low/missing scores
4. Actionable recommendations for the student and parent

Respond in JSON:
{
  "report": "The full report text in paragraphs"
}`;

    const result = await callOpenAIJSON<{ report: string }>(
      {
        systemMessage: "You are an experienced teacher writing student progress reports. Be professional, encouraging, and specific. Always respond with valid JSON.",
        prompt,
        maxTokens: 1024,
      },
    );

    res.json({ report: result.report || "Unable to generate report." });
  }));
}
