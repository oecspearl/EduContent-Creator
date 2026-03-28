import { db } from "../../db";
import { learnerProgress, quizAttempts, interactionEvents, h5pContent, profiles } from "@shared/schema";
import type {
  LearnerProgress, InsertLearnerProgress,
  QuizAttempt, InsertQuizAttempt,
  InteractionEvent, InsertInteractionEvent,
} from "@shared/schema";
import { eq, and, desc, count, avg, sum, sql, inArray } from "drizzle-orm";

export class AnalyticsRepository {
  // ─── Progress ─────────────────────────────────────────────

  async upsertLearnerProgress(progress: InsertLearnerProgress): Promise<LearnerProgress> {
    const [result] = await db
      .insert(learnerProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [learnerProgress.userId, learnerProgress.contentId],
        set: {
          completionPercentage: progress.completionPercentage,
          completedAt: progress.completedAt,
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getLearnerProgress(userId: string, contentId: string): Promise<LearnerProgress | undefined> {
    const [progress] = await db
      .select()
      .from(learnerProgress)
      .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.contentId, contentId)))
      .limit(1);
    return progress;
  }

  async getUserProgressByContentId(contentId: string): Promise<LearnerProgress[]> {
    return await db.select().from(learnerProgress).where(eq(learnerProgress.contentId, contentId));
  }

  async getAllUserProgress(userId: string): Promise<LearnerProgress[]> {
    return await db.select().from(learnerProgress).where(eq(learnerProgress.userId, userId));
  }

  // ─── Quiz attempts ───────────────────────────────────────

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [created] = await db.insert(quizAttempts).values(attempt).returning();
    return created;
  }

  async getQuizAttempts(userId: string, contentId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.contentId, contentId)))
      .orderBy(desc(quizAttempts.completedAt));
  }

  async getAllQuizAttemptsForContent(contentId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId))
      .orderBy(desc(quizAttempts.completedAt));
  }

  // ─── Interaction events ──────────────────────────────────

  async createInteractionEvent(event: InsertInteractionEvent): Promise<InteractionEvent> {
    const [created] = await db.insert(interactionEvents).values(event).returning();
    return created;
  }

  async getInteractionEvents(userId: string, contentId: string): Promise<InteractionEvent[]> {
    return await db
      .select()
      .from(interactionEvents)
      .where(and(eq(interactionEvents.userId, userId), eq(interactionEvents.contentId, contentId)))
      .orderBy(desc(interactionEvents.createdAt));
  }

  // ─── Aggregated analytics ────────────────────────────────

  async getContentAnalytics(contentId: string, content: any): Promise<any> {
    if (!content) return null;

    const progressStats = await db
      .select({
        uniqueViewers: count(learnerProgress.userId),
        avgCompletion: avg(learnerProgress.completionPercentage),
        totalCompleted: sum(sql`CASE WHEN ${learnerProgress.completionPercentage} >= 100 THEN 1 ELSE 0 END`),
      })
      .from(learnerProgress)
      .where(eq(learnerProgress.contentId, contentId));

    const quizStats = await db
      .select({
        totalAttempts: count(quizAttempts.id),
        avgScore: avg(quizAttempts.score),
        avgPercentage: sql<number>`AVG(CAST(${quizAttempts.score} AS FLOAT) / NULLIF(${quizAttempts.totalQuestions}, 0) * 100)`,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId));

    const interactionStats = await db
      .select({ totalInteractions: count(interactionEvents.id) })
      .from(interactionEvents)
      .where(eq(interactionEvents.contentId, contentId));

    const recentProgress = await db
      .select()
      .from(learnerProgress)
      .where(eq(learnerProgress.contentId, contentId))
      .orderBy(desc(learnerProgress.lastAccessedAt))
      .limit(10);

    return {
      content,
      stats: {
        uniqueViewers: Number(progressStats[0]?.uniqueViewers || 0),
        avgCompletion: Number(progressStats[0]?.avgCompletion || 0),
        totalCompleted: Number(progressStats[0]?.totalCompleted || 0),
        totalAttempts: Number(quizStats[0]?.totalAttempts || 0),
        avgScore: Number(quizStats[0]?.avgScore || 0),
        avgPercentage: Number(quizStats[0]?.avgPercentage || 0),
        totalInteractions: Number(interactionStats[0]?.totalInteractions || 0),
      },
      recentProgress,
    };
  }

  async getUserContentAnalytics(userContent: any[]): Promise<any[]> {
    const analyticsPromises = userContent.map(async (content) => {
      const progressStats = await db
        .select({
          uniqueViewers: count(learnerProgress.userId),
          avgCompletion: avg(learnerProgress.completionPercentage),
        })
        .from(learnerProgress)
        .where(eq(learnerProgress.contentId, content.id));

      const quizStats = await db
        .select({
          totalAttempts: count(quizAttempts.id),
          avgScore: avg(quizAttempts.score),
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.contentId, content.id));

      const interactionStats = await db
        .select({ totalInteractions: count(interactionEvents.id) })
        .from(interactionEvents)
        .where(eq(interactionEvents.contentId, content.id));

      return {
        contentId: content.id,
        title: content.title,
        type: content.type,
        isPublished: content.isPublished,
        createdAt: content.createdAt,
        uniqueViewers: Number(progressStats[0]?.uniqueViewers || 0),
        avgCompletion: Number(progressStats[0]?.avgCompletion || 0),
        totalAttempts: Number(quizStats[0]?.totalAttempts || 0),
        avgScore: Number(quizStats[0]?.avgScore || 0),
        totalInteractions: Number(interactionStats[0]?.totalInteractions || 0),
      };
    });

    return await Promise.all(analyticsPromises);
  }

  async getContentLearners(contentId: string): Promise<any[]> {
    const learners = await db
      .select({
        userId: learnerProgress.userId,
        fullName: profiles.fullName,
        email: profiles.email,
        role: profiles.role,
        completionPercentage: learnerProgress.completionPercentage,
        completedAt: learnerProgress.completedAt,
        lastAccessedAt: learnerProgress.lastAccessedAt,
        firstAccessedAt: learnerProgress.createdAt,
      })
      .from(learnerProgress)
      .innerJoin(profiles, eq(learnerProgress.userId, profiles.id))
      .where(eq(learnerProgress.contentId, contentId))
      .orderBy(desc(learnerProgress.lastAccessedAt));

    const userIds = learners.map(l => l.userId);

    const allQuizAttempts = userIds.length > 0 ? await db
      .select({
        userId: quizAttempts.userId,
        score: quizAttempts.score,
        totalQuestions: quizAttempts.totalQuestions,
        completedAt: quizAttempts.completedAt,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId))
      .orderBy(desc(quizAttempts.completedAt)) : [];

    const allInteractions = userIds.length > 0 ? await db
      .select({
        userId: interactionEvents.userId,
        totalInteractions: count(interactionEvents.id),
      })
      .from(interactionEvents)
      .where(eq(interactionEvents.contentId, contentId))
      .groupBy(interactionEvents.userId) : [];

    const quizAttemptsByUser = allQuizAttempts.reduce((acc, attempt) => {
      if (!acc[attempt.userId]) acc[attempt.userId] = [];
      acc[attempt.userId].push(attempt);
      return acc;
    }, {} as Record<string, typeof allQuizAttempts>);

    const interactionsByUser = allInteractions.reduce((acc, stat) => {
      acc[stat.userId] = stat.totalInteractions;
      return acc;
    }, {} as Record<string, number>);

    return learners.map((learner) => {
      const userAttempts = (quizAttemptsByUser[learner.userId] || []).slice(0, 5);
      return {
        userId: learner.userId,
        displayName: learner.fullName,
        email: learner.email,
        role: learner.role,
        completionPercentage: learner.completionPercentage,
        completedAt: learner.completedAt,
        lastAccessedAt: learner.lastAccessedAt,
        firstAccessedAt: learner.firstAccessedAt,
        quizAttempts: userAttempts.map(attempt => ({
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          percentage: (attempt.score / attempt.totalQuestions * 100).toFixed(1),
          completedAt: attempt.completedAt,
        })),
        totalInteractions: Number(interactionsByUser[learner.userId] || 0),
      };
    });
  }

  async getQuestionAnalytics(contentId: string): Promise<any> {
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId));

    if (attempts.length === 0) {
      return { totalAttempts: 0, questions: [] };
    }

    const questionStats: Record<string, {
      questionId: string;
      totalAttempts: number;
      correctCount: number;
      incorrectCount: number;
      successRate: number;
      difficultyScore: number;
      commonIncorrectAnswers: Record<string, number>;
    }> = {};

    attempts.forEach(attempt => {
      const answers = attempt.answers as Array<{
        questionId: string;
        answer: string | number | boolean;
        isCorrect: boolean;
      }>;

      answers.forEach(answer => {
        if (!questionStats[answer.questionId]) {
          questionStats[answer.questionId] = {
            questionId: answer.questionId,
            totalAttempts: 0,
            correctCount: 0,
            incorrectCount: 0,
            successRate: 0,
            difficultyScore: 0,
            commonIncorrectAnswers: {},
          };
        }

        const stats = questionStats[answer.questionId];
        stats.totalAttempts++;

        if (answer.isCorrect) {
          stats.correctCount++;
        } else {
          stats.incorrectCount++;
          const answerKey = String(answer.answer);
          stats.commonIncorrectAnswers[answerKey] = (stats.commonIncorrectAnswers[answerKey] || 0) + 1;
        }
      });
    });

    const questions = Object.values(questionStats).map(stats => {
      const successRate = (stats.correctCount / stats.totalAttempts) * 100;
      const difficultyScore = 100 - successRate;
      const topIncorrectAnswers = Object.entries(stats.commonIncorrectAnswers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([answer, count]) => ({ answer, count }));

      return {
        ...stats,
        successRate: Math.round(successRate * 10) / 10,
        difficultyScore: Math.round(difficultyScore * 10) / 10,
        commonIncorrectAnswers: topIncorrectAnswers,
      };
    });

    return { totalAttempts: attempts.length, questions };
  }

  async getStudentPerformanceDistribution(contentId: string): Promise<any> {
    const attempts = await db
      .select({
        userId: quizAttempts.userId,
        score: quizAttempts.score,
        totalQuestions: quizAttempts.totalQuestions,
        completedAt: quizAttempts.completedAt,
        fullName: profiles.fullName,
        email: profiles.email,
      })
      .from(quizAttempts)
      .innerJoin(profiles, eq(quizAttempts.userId, profiles.id))
      .where(eq(quizAttempts.contentId, contentId))
      .orderBy(desc(quizAttempts.completedAt));

    if (attempts.length === 0) {
      return { totalStudents: 0, distribution: [], students: [] };
    }

    const ranges: Record<string, number> = {
      '90-100%': 0, '80-89%': 0, '70-79%': 0, '60-69%': 0, '0-59%': 0,
    };

    const studentBestScores: Record<string, {
      userId: string; fullName: string; email: string;
      bestScore: number; bestPercentage: number;
      totalAttempts: number; latestAttempt: Date;
    }> = {};

    attempts.forEach(attempt => {
      const percentage = (attempt.score / attempt.totalQuestions) * 100;

      if (percentage >= 90) ranges['90-100%']++;
      else if (percentage >= 80) ranges['80-89%']++;
      else if (percentage >= 70) ranges['70-79%']++;
      else if (percentage >= 60) ranges['60-69%']++;
      else ranges['0-59%']++;

      if (!studentBestScores[attempt.userId] || percentage > studentBestScores[attempt.userId].bestPercentage) {
        studentBestScores[attempt.userId] = {
          userId: attempt.userId, fullName: attempt.fullName, email: attempt.email,
          bestScore: attempt.score, bestPercentage: percentage,
          totalAttempts: 1, latestAttempt: attempt.completedAt,
        };
      } else {
        studentBestScores[attempt.userId].totalAttempts++;
        if (attempt.completedAt > studentBestScores[attempt.userId].latestAttempt) {
          studentBestScores[attempt.userId].latestAttempt = attempt.completedAt;
        }
      }
    });

    const distribution = Object.entries(ranges).map(([range, count]) => ({
      range, count,
      percentage: Math.round((count / attempts.length) * 100 * 10) / 10,
    }));

    const students = Object.values(studentBestScores)
      .sort((a, b) => b.bestPercentage - a.bestPercentage)
      .map(student => ({
        ...student,
        bestPercentage: Math.round(student.bestPercentage * 10) / 10,
      }));

    return { totalStudents: students.length, totalAttempts: attempts.length, distribution, students };
  }

  async getScoreDistribution(contentId: string): Promise<any> {
    const attempts = await db
      .select({ score: quizAttempts.score, totalQuestions: quizAttempts.totalQuestions })
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId));

    if (attempts.length === 0) {
      return { totalAttempts: 0, distribution: [] };
    }

    const buckets: Record<string, number> = {};
    attempts.forEach(attempt => {
      const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
      const bucket = Math.floor(percentage / 10) * 10;
      const bucketKey = `${bucket}-${bucket + 9}%`;
      buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
    });

    const distribution = Object.entries(buckets)
      .map(([range, count]) => ({
        range, count,
        percentage: Math.round((count / attempts.length) * 100 * 10) / 10,
      }))
      .sort((a, b) => parseInt(a.range) - parseInt(b.range));

    return { totalAttempts: attempts.length, distribution };
  }

  async getRecentStudentActivity(teacherContentIds: string[], limit: number = 10): Promise<any[]> {
    if (teacherContentIds.length === 0) return [];

    return await db
      .select({
        progressId: learnerProgress.id,
        studentId: profiles.id,
        studentName: profiles.fullName,
        contentId: h5pContent.id,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        completionPercentage: learnerProgress.completionPercentage,
        lastAccessedAt: learnerProgress.lastAccessedAt,
      })
      .from(learnerProgress)
      .innerJoin(profiles, eq(learnerProgress.userId, profiles.id))
      .innerJoin(h5pContent, eq(learnerProgress.contentId, h5pContent.id))
      .where(inArray(learnerProgress.contentId, teacherContentIds))
      .orderBy(desc(learnerProgress.lastAccessedAt))
      .limit(limit);
  }
}
