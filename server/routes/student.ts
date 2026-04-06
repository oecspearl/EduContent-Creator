/**
 * Student-specific API routes.
 *
 * These endpoints serve the student dashboard — assignments, scores,
 * progress analytics, and AI-powered study insights.
 */
import { z } from "zod";
import { db } from "../../db";
import { studentAssignments, h5pContent, learnerProgress, quizAttempts } from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { callOpenAIJSON } from "../utils/openai-helper";
import { rateLimit } from "../middleware/rate-limit";
import { asyncHandler } from "../utils/async-handler";
import type { RouteContext } from "./types";

const studentAIRateLimit = rateLimit({
  maxRequests: 20,
  windowSeconds: 3600, // 20 AI calls per hour per student
  keyGenerator: (req) => `student-ai-${(req.session as any)?.userId || req.ip}`,
  message: "You've used all your AI insights for now. Try again in an hour.",
});

export function registerStudentRoutes({ app, storage, requireAuth }: RouteContext) {
  // Get assignments for the logged-in student (class-level + individual)
  app.get("/api/student/my-assignments", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.session.userId!;

    // Class-level assignments
    const classAssignments = await storage.getStudentAssignments(userId);

    // Individual student-level assignments
    const individualAssignments = await db.select({
      assignmentId: studentAssignments.id,
      contentId: h5pContent.id,
      contentTitle: h5pContent.title,
      contentType: h5pContent.type,
      assignedAt: studentAssignments.assignedAt,
      dueDate: studentAssignments.dueDate,
      instructions: studentAssignments.instructions,
    })
      .from(studentAssignments)
      .innerJoin(h5pContent, eq(studentAssignments.contentId, h5pContent.id))
      .where(eq(studentAssignments.studentId, userId))
      .orderBy(desc(studentAssignments.assignedAt));

    // Merge, deduplicate by contentId (class assignment takes precedence)
    const seenContentIds = new Set(classAssignments.map((a: any) => a.contentId));
    const merged = [
      ...classAssignments,
      ...individualAssignments
        .filter(a => !seenContentIds.has(a.contentId))
        .map(a => ({ ...a, classId: null, className: "Individual Assignment" })),
    ];

    // Batch fetch all progress for this user's assigned content
    const contentIds = merged.map((a: any) => a.contentId);
    const allProgress = contentIds.length > 0
      ? await db.select().from(learnerProgress)
          .where(and(eq(learnerProgress.userId, userId), inArray(learnerProgress.contentId, contentIds)))
      : [];
    const progressMap = new Map(allProgress.map(p => [p.contentId, p]));

    const enriched = merged.map((a: any) => {
      const progress = progressMap.get(a.contentId);
      return {
        ...a,
        completionPercentage: progress?.completionPercentage ?? 0,
        completedAt: progress?.completedAt ?? null,
        lastAccessedAt: progress?.lastAccessedAt ?? null,
      };
    });

    res.json(enriched);
  }));

  // Get the student's quiz scores across all content
  app.get("/api/student/my-scores", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.session.userId!;

    // Get all classes the student is in, then all assignments
    const assignments = await storage.getStudentAssignments(userId);
    const contentIds = Array.from(new Set(assignments.map((a: any) => a.contentId)));

    // Batch fetch all quiz attempts for this user's assigned content
    const allAttempts = contentIds.length > 0
      ? await db.select().from(quizAttempts)
          .where(and(eq(quizAttempts.userId, userId), inArray(quizAttempts.contentId, contentIds)))
      : [];
    // Group by contentId
    const attemptsByContent = new Map<string, typeof allAttempts>();
    for (const a of allAttempts) {
      const list = attemptsByContent.get(a.contentId) || [];
      list.push(a);
      attemptsByContent.set(a.contentId, list);
    }

    const scores: any[] = [];
    for (const contentId of contentIds) {
      const attempts = attemptsByContent.get(contentId) || [];
      if (attempts.length > 0) {
        const assignment = assignments.find((a: any) => a.contentId === contentId);
        const bestAttempt = attempts.reduce((best, a) =>
          (a.score / a.totalQuestions) > (best.score / best.totalQuestions) ? a : best
        );
        scores.push({
          contentId,
          contentTitle: assignment?.contentTitle ?? "Unknown",
          contentType: assignment?.contentType ?? "quiz",
          className: assignment?.className ?? "Unknown",
          attempts: attempts.length,
          bestScore: bestAttempt.score,
          bestTotal: bestAttempt.totalQuestions,
          bestPercentage: Math.round((bestAttempt.score / bestAttempt.totalQuestions) * 100),
          latestAttemptDate: attempts[0].completedAt,
        });
      }
    }

    res.json(scores);
  }));

  // Get overall progress summary for the student
  app.get("/api/student/my-progress", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.session.userId!;

    const allProgress = await storage.getAllUserProgress(userId);
    const assignments = await storage.getStudentAssignments(userId);
    const classes = await storage.getStudentClasses(userId);

    const totalAssignments = assignments.length;
    const completedAssignments = allProgress.filter(p => p.completionPercentage >= 100).length;
    const avgCompletion = allProgress.length > 0
      ? Math.round(allProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / allProgress.length)
      : 0;

    // Build per-content progress list
    const progressDetails = assignments.map((a: any) => {
      const p = allProgress.find(pr => pr.contentId === a.contentId);
      return {
        contentId: a.contentId,
        contentTitle: a.contentTitle,
        contentType: a.contentType,
        className: a.className,
        dueDate: a.dueDate,
        completionPercentage: p?.completionPercentage ?? 0,
        completedAt: p?.completedAt ?? null,
        lastAccessedAt: p?.lastAccessedAt ?? null,
      };
    });

    res.json({
      summary: {
        totalClasses: classes.length,
        totalAssignments,
        completedAssignments,
        avgCompletion,
        inProgressAssignments: totalAssignments - completedAssignments,
      },
      progress: progressDetails,
    });
  }));

  // Student gradebook — grades per class with best scores
  app.get("/api/student/gradebook", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.session.userId!;

    const classes = await storage.getStudentClasses(userId);
    if (classes.length === 0) return res.json({ classes: [], overall: null });

    // Get all assignments + individual assignments in parallel
    const [classAssignments, individualRows] = await Promise.all([
      storage.getStudentAssignments(userId),
      db.select({
        contentId: h5pContent.id,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        assignedAt: studentAssignments.assignedAt,
        dueDate: studentAssignments.dueDate,
      })
        .from(studentAssignments)
        .innerJoin(h5pContent, eq(studentAssignments.contentId, h5pContent.id))
        .where(eq(studentAssignments.studentId, userId)),
    ]);

    // All content IDs the student has assignments for
    const allContentIds = Array.from(new Set([
      ...classAssignments.map((a: any) => a.contentId),
      ...individualRows.map(a => a.contentId),
    ]));

    // Batch fetch all quiz attempts and progress
    const [allAttempts, allProgress] = await Promise.all([
      allContentIds.length > 0
        ? db.select().from(quizAttempts)
            .where(and(eq(quizAttempts.userId, userId), inArray(quizAttempts.contentId, allContentIds)))
        : Promise.resolve([]),
      allContentIds.length > 0
        ? db.select().from(learnerProgress)
            .where(and(eq(learnerProgress.userId, userId), inArray(learnerProgress.contentId, allContentIds)))
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const attemptsByContent = new Map<string, typeof allAttempts>();
    for (const a of allAttempts) {
      const list = attemptsByContent.get(a.contentId) || [];
      list.push(a);
      attemptsByContent.set(a.contentId, list);
    }
    const progressByContent = new Map(allProgress.map(p => [p.contentId, p]));

    function gradeForContent(contentId: string) {
      const attempts = attemptsByContent.get(contentId) || [];
      const progress = progressByContent.get(contentId);
      if (attempts.length > 0) {
        const best = attempts.reduce((b, a) =>
          (a.score / a.totalQuestions) > (b.score / b.totalQuestions) ? a : b
        );
        return {
          bestScore: best.score,
          bestTotal: best.totalQuestions,
          bestPercentage: Math.round((best.score / best.totalQuestions) * 100),
          attempts: attempts.length,
          completionPercentage: progress?.completionPercentage ?? 0,
          completedAt: progress?.completedAt?.toISOString() ?? null,
        };
      }
      return {
        bestScore: null,
        bestTotal: null,
        bestPercentage: null,
        attempts: 0,
        completionPercentage: progress?.completionPercentage ?? 0,
        completedAt: progress?.completedAt?.toISOString() ?? null,
      };
    }

    // Build per-class data
    const classData = classes.map(c => {
      const assignments = classAssignments.filter((a: any) => a.classId === c.id);
      const grades = assignments.map((a: any) => ({
        contentId: a.contentId,
        contentTitle: a.contentTitle,
        contentType: a.contentType,
        dueDate: a.dueDate,
        ...gradeForContent(a.contentId),
      }));

      const gradedItems = grades.filter(g => g.bestPercentage !== null);
      const classAverage = gradedItems.length > 0
        ? Math.round(gradedItems.reduce((sum, g) => sum + g.bestPercentage!, 0) / gradedItems.length)
        : null;

      return {
        classId: c.id,
        className: c.name,
        subject: c.subject,
        gradeLevel: c.gradeLevel,
        assignments: grades,
        classAverage,
        totalAssignments: assignments.length,
        completedAssignments: grades.filter(g => g.completionPercentage >= 100).length,
      };
    });

    // Individual assignments (not tied to a class)
    const seenInClass = new Set(classAssignments.map((a: any) => a.contentId));
    const individualGrades = individualRows
      .filter(a => !seenInClass.has(a.contentId))
      .map(a => ({
        contentId: a.contentId,
        contentTitle: a.contentTitle,
        contentType: a.contentType,
        dueDate: a.dueDate,
        ...gradeForContent(a.contentId),
      }));

    // Overall stats
    const allGrades = [...classData.flatMap(c => c.assignments), ...individualGrades];
    const allGraded = allGrades.filter(g => g.bestPercentage !== null);
    const overallAverage = allGraded.length > 0
      ? Math.round(allGraded.reduce((sum, g) => sum + g.bestPercentage!, 0) / allGraded.length)
      : null;

    res.json({
      classes: classData,
      individualAssignments: individualGrades,
      overall: {
        average: overallAverage,
        totalAssignments: allGrades.length,
        totalGraded: allGraded.length,
        totalCompleted: allGrades.filter(g => g.completionPercentage >= 100).length,
      },
    });
  }));

  // AI-powered study insights after completing a quiz
  const insightsSchema = z.object({
    score: z.number(),
    totalQuestions: z.number().min(1),
    percentage: z.number(),
    totalIncorrect: z.number(),
    incorrectQuestions: z.array(z.object({
      question: z.string(),
      type: z.string(),
      studentAnswer: z.any(),
      correctAnswer: z.any(),
      options: z.array(z.string()).optional().nullable(),
      isCorrect: z.boolean(),
      explanation: z.string().optional().nullable(),
    })),
  });

  app.post("/api/student/ai-insights", requireAuth, studentAIRateLimit, asyncHandler(async (req: any, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "AI features are not configured." });
    }

    const parsed = insightsSchema.parse(req.body);

    const incorrectSummary = parsed.incorrectQuestions
      .map((q, i) => {
        const studentAns = typeof q.studentAnswer === "number" && q.options
          ? q.options[q.studentAnswer]
          : String(q.studentAnswer ?? "no answer");
        const correctAns = typeof q.correctAnswer === "number" && q.options
          ? q.options[q.correctAnswer]
          : String(q.correctAnswer);
        return `${i + 1}. "${q.question}" (${q.type}) — Student answered: "${studentAns}", Correct: "${correctAns}"${q.explanation ? ` — Explanation: ${q.explanation}` : ""}`;
      })
      .join("\n");

    const prompt = `A student just completed a quiz and scored ${parsed.score}/${parsed.totalQuestions} (${parsed.percentage}%).

${parsed.totalIncorrect > 0 ? `They got these questions wrong:\n${incorrectSummary}` : "They got every question correct!"}

Generate encouraging, student-friendly study insights. The student should feel motivated, not discouraged.

Respond in JSON:
{
  "overallFeedback": "2-3 sentences of encouraging feedback about their performance",
  "strengths": ["1-2 things they did well based on their score"],
  "areasToImprove": ["1-3 specific concepts to review based on wrong answers, if any"],
  "questionInsights": [
    {
      "questionId": "q1",
      "insight": "Brief, helpful explanation of why the correct answer is right — written for a student, 1-2 sentences max"
    }
  ],
  "studyTips": ["2-3 actionable study tips related to the topics they struggled with"]
}

Rules:
- Be warm and encouraging — use language appropriate for a school student
- If they scored 100%, celebrate and give advanced study suggestions
- questionInsights should only cover wrong answers — skip correct ones
- Keep each insight concise (1-2 sentences)
- Focus on understanding concepts, not memorizing answers`;

    const result = await callOpenAIJSON<{
      overallFeedback: string;
      strengths: string[];
      areasToImprove: string[];
      questionInsights: Array<{ questionId: string; insight: string }>;
      studyTips: string[];
    }>(
      {
        systemMessage: "You are a friendly, encouraging tutor helping a student understand their quiz results. Always respond with valid JSON.",
        prompt,
        maxTokens: 2048,
      },
    );

    res.json({
      overallFeedback: result.overallFeedback || "",
      strengths: result.strengths || [],
      areasToImprove: result.areasToImprove || [],
      questionInsights: result.questionInsights || [],
      studyTips: result.studyTips || [],
    });
  }));

  // Single-question AI insight — lightweight endpoint for per-question "Explain" button
  const questionInsightSchema = z.object({
    question: z.string().min(1),
    type: z.string(),
    studentAnswer: z.any(),
    correctAnswer: z.any(),
    options: z.array(z.string()).optional().nullable(),
    isCorrect: z.boolean(),
    explanation: z.string().optional().nullable(),
  });

  app.post("/api/student/ai-question-insight", requireAuth, studentAIRateLimit, asyncHandler(async (req: any, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "AI features are not configured." });
    }

    const q = questionInsightSchema.parse(req.body);

    const studentAns = typeof q.studentAnswer === "number" && q.options
      ? q.options[q.studentAnswer]
      : String(q.studentAnswer ?? "no answer");
    const correctAns = typeof q.correctAnswer === "number" && q.options
      ? q.options[q.correctAnswer]
      : String(q.correctAnswer);

    const prompt = `A student answered a ${q.type} question.

Question: "${q.question}"
Student's answer: "${studentAns}"
Correct answer: "${correctAns}"
${q.isCorrect ? "The student got it RIGHT." : "The student got it WRONG."}
${q.explanation ? `Teacher's explanation: ${q.explanation}` : ""}

${q.isCorrect
  ? "Give a brief congratulatory note (1 sentence) and then explain WHY this answer is correct and what concept it demonstrates (2-3 sentences). Help the student deepen their understanding."
  : "Explain WHY the correct answer is right in a way a student can understand (2-3 sentences). Then give a short, practical tip for remembering this concept (1 sentence). Be encouraging, not critical."}

Respond in JSON:
{
  "insight": "Your explanation here — 3-4 sentences total, written for a student"
}`;

    const result = await callOpenAIJSON<{ insight: string }>(
      {
        systemMessage: "You are a friendly tutor explaining a quiz question to a student. Be clear, encouraging, and concise. Always respond with valid JSON.",
        prompt,
        maxTokens: 512,
      },
    );

    res.json({ insight: result.insight || "No insight available." });
  }));
}
