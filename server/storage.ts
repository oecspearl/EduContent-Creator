import { db } from "../db";
import { profiles, h5pContent, contentShares, learnerProgress, quizAttempts, interactionEvents, chatMessages, classes, classEnrollments, contentAssignments } from "@shared/schema";
import type { 
  Profile, InsertProfile, 
  H5pContent, InsertH5pContent, 
  ContentShare, InsertContentShare,
  LearnerProgress, InsertLearnerProgress,
  QuizAttempt, InsertQuizAttempt,
  InteractionEvent, InsertInteractionEvent,
  ChatMessage, InsertChatMessage,
  Class, InsertClass,
  ClassEnrollment, InsertClassEnrollment,
  ContentAssignment, InsertContentAssignment
} from "@shared/schema";
import { eq, and, desc, sql, count, avg, sum, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Profile methods
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, updates: Partial<InsertProfile>): Promise<Profile | undefined>;
  getProfileById(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  setPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<Profile | undefined>;
  getProfileByResetToken(token: string): Promise<Profile | undefined>;
  clearPasswordResetToken(id: string): Promise<void>;
  
  // Content methods
  createContent(content: InsertH5pContent): Promise<H5pContent>;
  updateContent(id: string, updates: Partial<InsertH5pContent>): Promise<H5pContent | undefined>;
  deleteContent(id: string): Promise<void>;
  getContentById(id: string): Promise<H5pContent | undefined>;
  getContentByUserId(userId: string, limit?: number): Promise<H5pContent[]>;
  getPublishedContent(id: string): Promise<H5pContent | undefined>;
  getPublicContent(): Promise<H5pContent[]>;
  copyContent(contentId: string, userId: string): Promise<H5pContent>;
  
  // Share methods
  createShare(share: InsertContentShare): Promise<ContentShare>;
  getSharesByContentId(contentId: string): Promise<ContentShare[]>;
  
  // Progress tracking methods
  upsertLearnerProgress(progress: InsertLearnerProgress): Promise<LearnerProgress>;
  getLearnerProgress(userId: string, contentId: string): Promise<LearnerProgress | undefined>;
  getUserProgressByContentId(contentId: string): Promise<LearnerProgress[]>;
  getAllUserProgress(userId: string): Promise<LearnerProgress[]>;
  
  // Quiz attempt methods
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttempts(userId: string, contentId: string): Promise<QuizAttempt[]>;
  
  // Interaction event methods
  createInteractionEvent(event: InsertInteractionEvent): Promise<InteractionEvent>;
  getInteractionEvents(userId: string, contentId: string): Promise<InteractionEvent[]>;
  
  // Analytics methods
  getContentAnalytics(contentId: string): Promise<any>;
  getUserContentAnalytics(userId: string): Promise<any[]>;
  getContentLearners(contentId: string): Promise<any[]>;
  getQuestionAnalytics(contentId: string): Promise<any>;
  getStudentPerformanceDistribution(contentId: string): Promise<any>;
  getScoreDistribution(contentId: string): Promise<any>;
  getAllQuizAttemptsForContent(contentId: string): Promise<QuizAttempt[]>;
  
  // Chat message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;
  deleteChatHistory(userId: string): Promise<void>;
  
  // Class methods
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: string, updates: Partial<InsertClass>): Promise<Class | undefined>;
  deleteClass(id: string): Promise<void>;
  getClassById(id: string): Promise<Class | undefined>;
  getClassesByUserId(userId: string): Promise<Class[]>;
  
  // Class enrollment methods
  createClassEnrollment(enrollment: InsertClassEnrollment): Promise<ClassEnrollment>;
  deleteClassEnrollment(classId: string, userId: string): Promise<void>;
  getClassEnrollments(classId: string): Promise<any[]>;
  getStudentClasses(userId: string): Promise<Class[]>;
  bulkCreateEnrollments(enrollments: InsertClassEnrollment[]): Promise<ClassEnrollment[]>;
  
  // Content assignment methods
  createContentAssignment(assignment: InsertContentAssignment): Promise<ContentAssignment>;
  deleteContentAssignment(contentId: string, classId: string): Promise<void>;
  getContentAssignments(contentId: string): Promise<any[]>;
  getClassAssignments(classId: string): Promise<any[]>;
  getStudentAssignments(userId: string): Promise<any[]>;
}

export class DbStorage implements IStorage {
  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    // Only hash password if it's provided and not already hashed (OAuth users come with pre-hashed sentinel)
    const password = insertProfile.password 
      ? (insertProfile.password.startsWith('$2') ? insertProfile.password : await bcrypt.hash(insertProfile.password, 10))
      : null;
    
    const [profile] = await db
      .insert(profiles)
      .values({ ...insertProfile, password })
      .returning();
    return profile;
  }

  async updateProfile(id: string, updates: Partial<InsertProfile>): Promise<Profile | undefined> {
    // Hash password if it's being updated and not already hashed
    if (updates.password && typeof updates.password === 'string' && !updates.password.startsWith('$2')) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    const updateData: any = { ...updates };
    updateData.updatedAt = new Date();
    
    const [profile] = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, id))
      .returning();
    return profile;
  }

  async getProfileById(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return profile;
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    return profile;
  }

  async setPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<Profile | undefined> {
    const [profile] = await db
      .update(profiles)
      .set({
        passwordResetToken: token,
        passwordResetExpiry: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(profiles.email, email))
      .returning();
    return profile;
  }

  async getProfileByResetToken(token: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.passwordResetToken, token))
      .limit(1);
    return profile;
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    await db
      .update(profiles)
      .set({
        passwordResetToken: null,
        passwordResetExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, id));
  }

  async createContent(insertContent: InsertH5pContent): Promise<H5pContent> {
    const [content] = await db.insert(h5pContent).values(insertContent).returning();
    return content;
  }

  async updateContent(id: string, updates: Partial<InsertH5pContent>): Promise<H5pContent | undefined> {
    const [content] = await db
      .update(h5pContent)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(h5pContent.id, id))
      .returning();
    return content;
  }

  async deleteContent(id: string): Promise<void> {
    await db.delete(h5pContent).where(eq(h5pContent.id, id));
  }

  async getContentById(id: string): Promise<H5pContent | undefined> {
    const [content] = await db.select().from(h5pContent).where(eq(h5pContent.id, id)).limit(1);
    return content;
  }

  async getContentByUserId(userId: string, limit?: number): Promise<H5pContent[]> {
    try {
      console.log("[STORAGE] getContentByUserId called with userId:", userId);
      console.log("[STORAGE] Database instance exists:", !!db);
      
      // Build query with limit to prevent "response too large" errors
      // Start with very small limit since some users have extremely large content items
      // We'll use lightweight metadata-only retrieval for large datasets
      const queryLimit = limit || 50;
      
      let query = db
        .select()
        .from(h5pContent)
        .where(eq(h5pContent.userId, userId))
        .orderBy(desc(h5pContent.updatedAt))
        .limit(queryLimit);
      
      const result = await query;
      console.log("[STORAGE] Query successful, returned", result.length, "items (limit:", queryLimit, ")");
      
      // If we hit the limit, warn that there might be more content
      if (result.length === queryLimit) {
        console.warn("[STORAGE] Warning: Query returned maximum items. There may be more content.");
      }
      
      return result;
    } catch (error: any) {
      console.error("========================================");
      console.error("[STORAGE] Database query error in getContentByUserId");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      
      // Special handling for "response too large" error
      if (error.message && (error.message.includes("response is too large") || error.message.includes("507"))) {
        console.error("[STORAGE] ERROR: User has too much content! Response exceeds 64MB limit.");
        console.error("[STORAGE] Solution: Implementing lightweight retrieval (metadata only)...");
        
        // Try to get content metadata only (without the large data field)
        try {
          // Select only essential fields, excluding the large JSONB data field
          const chunkSize = 10; // Very small chunks since items are huge
          let allContent: any[] = [];
          let offset = 0;
          let hasMore = true;
          let attempts = 0;
          const maxAttempts = 50; // Limit to 500 items max (50 chunks * 10 items)
          
          while (hasMore && allContent.length < 500 && attempts < maxAttempts) {
            attempts++;
            try {
              // Try to get just metadata first
              const chunk = await db
                .select({
                  id: h5pContent.id,
                  title: h5pContent.title,
                  description: h5pContent.description,
                  type: h5pContent.type,
                  userId: h5pContent.userId,
                  isPublished: h5pContent.isPublished,
                  isPublic: h5pContent.isPublic,
                  tags: h5pContent.tags,
                  createdAt: h5pContent.createdAt,
                  updatedAt: h5pContent.updatedAt,
                  // Exclude the large 'data' field for now
                })
                .from(h5pContent)
                .where(eq(h5pContent.userId, userId))
                .orderBy(desc(h5pContent.updatedAt))
                .limit(chunkSize)
                .offset(offset);
              
              if (chunk.length === 0) {
                hasMore = false;
              } else {
                // Add empty data field to maintain structure
                const chunkWithData = chunk.map(item => ({
                  ...item,
                  data: {} // Empty data for list view
                }));
                allContent = allContent.concat(chunkWithData);
                offset += chunkSize;
                
                // If we got less than chunkSize, we're done
                if (chunk.length < chunkSize) {
                  hasMore = false;
                }
              }
            } catch (chunkError: any) {
              console.error(`[STORAGE] Chunk ${attempts} failed:`, chunkError.message);
              // If even metadata fails, try even smaller chunks
              if (chunkSize > 1) {
                console.warn(`[STORAGE] Reducing chunk size and retrying...`);
                // Will retry with same offset on next iteration
                continue;
              } else {
                hasMore = false;
              }
            }
          }
          
          console.log(`[STORAGE] Retrieved ${allContent.length} items (metadata only)`);
          console.warn(`[STORAGE] Note: Full content data excluded due to size. Load individual items when needed.`);
          return allContent;
        } catch (chunkError: any) {
          console.error("[STORAGE] Lightweight retrieval also failed:", chunkError.message);
          console.warn("[STORAGE] Returning empty array to prevent crash.");
          console.warn("[STORAGE] User may need to delete some old/large content items.");
          return [];
        }
      }
      
      console.error("Error code:", error.code);
      console.error("Error stack:", error.stack);
      console.error("User ID:", userId);
      console.error("========================================");
      throw error;
    }
  }

  async getPublishedContent(id: string): Promise<H5pContent | undefined> {
    const [content] = await db
      .select()
      .from(h5pContent)
      .where(and(eq(h5pContent.id, id), eq(h5pContent.isPublished, true)))
      .limit(1);
    return content;
  }

  async getPublicContent(): Promise<any[]> {
    console.log('[DEBUG] getPublicContent called');
    const results = await db
      .select({
        id: h5pContent.id,
        title: h5pContent.title,
        description: h5pContent.description,
        type: h5pContent.type,
        data: h5pContent.data,
        userId: h5pContent.userId,
        isPublished: h5pContent.isPublished,
        isPublic: h5pContent.isPublic,
        tags: h5pContent.tags,
        createdAt: h5pContent.createdAt,
        updatedAt: h5pContent.updatedAt,
        creatorName: profiles.fullName,
        creatorInstitution: profiles.institution,
      })
      .from(h5pContent)
      .leftJoin(profiles, eq(h5pContent.userId, profiles.id))
      .where(and(eq(h5pContent.isPublic, true), eq(h5pContent.isPublished, true)))
      .orderBy(desc(h5pContent.createdAt));
    console.log(`[DEBUG] getPublicContent returned ${results.length} results`);
    return results;
  }

  async copyContent(contentId: string, userId: string): Promise<H5pContent> {
    // Get the original content - only if it's published and public
    const [original] = await db
      .select()
      .from(h5pContent)
      .where(and(
        eq(h5pContent.id, contentId),
        eq(h5pContent.isPublished, true),
        eq(h5pContent.isPublic, true)
      ))
      .limit(1);
    
    if (!original) {
      throw new Error("Content not found or not available for copying");
    }
    
    // Create a copy with new ownership and reset publication state
    const copyData: InsertH5pContent = {
      userId,
      title: `Copy of ${original.title}`,
      description: original.description,
      type: original.type,
      data: original.data as any,
      tags: original.tags,
      isPublished: false,
      isPublic: false,
    };
    
    const [copiedContent] = await db.insert(h5pContent).values(copyData).returning();
    return copiedContent;
  }

  async createShare(insertShare: InsertContentShare): Promise<ContentShare> {
    const [share] = await db.insert(contentShares).values(insertShare).returning();
    return share;
  }

  async getSharesByContentId(contentId: string): Promise<ContentShare[]> {
    return await db.select().from(contentShares).where(eq(contentShares.contentId, contentId));
  }

  async upsertLearnerProgress(progress: InsertLearnerProgress): Promise<LearnerProgress> {
    // Try to insert, on conflict update
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
      .where(and(
        eq(learnerProgress.userId, userId),
        eq(learnerProgress.contentId, contentId)
      ))
      .limit(1);
    return progress;
  }

  async getUserProgressByContentId(contentId: string): Promise<LearnerProgress[]> {
    return await db.select().from(learnerProgress).where(eq(learnerProgress.contentId, contentId));
  }

  async getAllUserProgress(userId: string): Promise<LearnerProgress[]> {
    return await db.select().from(learnerProgress).where(eq(learnerProgress.userId, userId));
  }

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [created] = await db.insert(quizAttempts).values(attempt).returning();
    return created;
  }

  async getQuizAttempts(userId: string, contentId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.contentId, contentId)
      ))
      .orderBy(desc(quizAttempts.completedAt));
  }

  async createInteractionEvent(event: InsertInteractionEvent): Promise<InteractionEvent> {
    const [created] = await db.insert(interactionEvents).values(event).returning();
    return created;
  }

  async getInteractionEvents(userId: string, contentId: string): Promise<InteractionEvent[]> {
    return await db
      .select()
      .from(interactionEvents)
      .where(and(
        eq(interactionEvents.userId, userId),
        eq(interactionEvents.contentId, contentId)
      ))
      .orderBy(desc(interactionEvents.createdAt));
  }

  async getContentAnalytics(contentId: string): Promise<any> {
    // Get content info
    const content = await this.getContentById(contentId);
    if (!content) return null;

    // Get unique viewers and average completion
    const progressStats = await db
      .select({
        uniqueViewers: count(learnerProgress.userId),
        avgCompletion: avg(learnerProgress.completionPercentage),
        totalCompleted: sum(sql`CASE WHEN ${learnerProgress.completionPercentage} >= 100 THEN 1 ELSE 0 END`),
      })
      .from(learnerProgress)
      .where(eq(learnerProgress.contentId, contentId));

    // Get quiz stats if it's a quiz
    const quizStats = await db
      .select({
        totalAttempts: count(quizAttempts.id),
        avgScore: avg(quizAttempts.score),
        avgPercentage: sql<number>`AVG(CAST(${quizAttempts.score} AS FLOAT) / NULLIF(${quizAttempts.totalQuestions}, 0) * 100)`,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId));

    // Get interaction count
    const interactionStats = await db
      .select({
        totalInteractions: count(interactionEvents.id),
      })
      .from(interactionEvents)
      .where(eq(interactionEvents.contentId, contentId));

    // Get recent progress entries (last 7 days)
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

  async getUserContentAnalytics(userId: string): Promise<any[]> {
    // Get all content owned by user
    const userContent = await this.getContentByUserId(userId);

    // Get analytics for each content item
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
        .select({
          totalInteractions: count(interactionEvents.id),
        })
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
    // Get all learners with their progress and profile info in one query
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

    // Get all user IDs to fetch quiz attempts and interactions efficiently
    const userIds = learners.map(l => l.userId);
    
    // Batch fetch quiz attempts for all users
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

    // Batch fetch interaction counts for all users
    const allInteractions = userIds.length > 0 ? await db
      .select({
        userId: interactionEvents.userId,
        totalInteractions: count(interactionEvents.id),
      })
      .from(interactionEvents)
      .where(eq(interactionEvents.contentId, contentId))
      .groupBy(interactionEvents.userId) : [];

    // Create lookup maps
    const quizAttemptsByUser = allQuizAttempts.reduce((acc, attempt) => {
      if (!acc[attempt.userId]) acc[attempt.userId] = [];
      acc[attempt.userId].push(attempt);
      return acc;
    }, {} as Record<string, typeof allQuizAttempts>);

    const interactionsByUser = allInteractions.reduce((acc, stat) => {
      acc[stat.userId] = stat.totalInteractions;
      return acc;
    }, {} as Record<string, number>);

    // Combine data
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
    // Get all quiz attempts for this content
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId));

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        questions: [],
      };
    }

    // Aggregate question-level data
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
          // Track incorrect answers
          const answerKey = String(answer.answer);
          stats.commonIncorrectAnswers[answerKey] = (stats.commonIncorrectAnswers[answerKey] || 0) + 1;
        }
      });
    });

    // Calculate success rates and difficulty scores
    const questions = Object.values(questionStats).map(stats => {
      const successRate = (stats.correctCount / stats.totalAttempts) * 100;
      const difficultyScore = 100 - successRate;
      
      // Get top 3 most common incorrect answers
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

    return {
      totalAttempts: attempts.length,
      questions,
    };
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
      return {
        totalStudents: 0,
        distribution: [],
        students: [],
      };
    }

    // Calculate performance ranges
    const ranges = {
      '90-100%': 0,
      '80-89%': 0,
      '70-79%': 0,
      '60-69%': 0,
      '0-59%': 0,
    };

    // Get unique students and their best scores
    const studentBestScores: Record<string, {
      userId: string;
      fullName: string;
      email: string;
      bestScore: number;
      bestPercentage: number;
      totalAttempts: number;
      latestAttempt: Date;
    }> = {};

    attempts.forEach(attempt => {
      const percentage = (attempt.score / attempt.totalQuestions) * 100;
      
      // Categorize into ranges
      if (percentage >= 90) ranges['90-100%']++;
      else if (percentage >= 80) ranges['80-89%']++;
      else if (percentage >= 70) ranges['70-79%']++;
      else if (percentage >= 60) ranges['60-69%']++;
      else ranges['0-59%']++;

      // Track best scores per student
      if (!studentBestScores[attempt.userId] || percentage > studentBestScores[attempt.userId].bestPercentage) {
        studentBestScores[attempt.userId] = {
          userId: attempt.userId,
          fullName: attempt.fullName,
          email: attempt.email,
          bestScore: attempt.score,
          bestPercentage: percentage,
          totalAttempts: 1,
          latestAttempt: attempt.completedAt,
        };
      } else {
        studentBestScores[attempt.userId].totalAttempts++;
        if (attempt.completedAt > studentBestScores[attempt.userId].latestAttempt) {
          studentBestScores[attempt.userId].latestAttempt = attempt.completedAt;
        }
      }
    });

    const distribution = Object.entries(ranges).map(([range, count]) => ({
      range,
      count,
      percentage: Math.round((count / attempts.length) * 100 * 10) / 10,
    }));

    const students = Object.values(studentBestScores)
      .sort((a, b) => b.bestPercentage - a.bestPercentage)
      .map(student => ({
        ...student,
        bestPercentage: Math.round(student.bestPercentage * 10) / 10,
      }));

    return {
      totalStudents: students.length,
      totalAttempts: attempts.length,
      distribution,
      students,
    };
  }

  async getScoreDistribution(contentId: string): Promise<any> {
    const attempts = await db
      .select({
        score: quizAttempts.score,
        totalQuestions: quizAttempts.totalQuestions,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId));

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        distribution: [],
      };
    }

    // Create score buckets (0-10, 11-20, etc. as percentages)
    const buckets: Record<string, number> = {};
    
    attempts.forEach(attempt => {
      const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
      const bucket = Math.floor(percentage / 10) * 10;
      const bucketKey = `${bucket}-${bucket + 9}%`;
      buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
    });

    const distribution = Object.entries(buckets)
      .map(([range, count]) => ({
        range,
        count,
        percentage: Math.round((count / attempts.length) * 100 * 10) / 10,
      }))
      .sort((a, b) => {
        const aStart = parseInt(a.range.split('-')[0]);
        const bStart = parseInt(b.range.split('-')[0]);
        return aStart - bStart;
      });

    return {
      totalAttempts: attempts.length,
      distribution,
    };
  }

  async getAllQuizAttemptsForContent(contentId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.contentId, contentId))
      .orderBy(desc(quizAttempts.completedAt));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [chatMessage] = await db.insert(chatMessages).values(message).returning();
    return chatMessage;
  }

  async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async deleteChatHistory(userId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }

  // Class methods
  async createClass(classData: InsertClass): Promise<Class> {
    const [class_] = await db.insert(classes).values({
      ...classData,
      updatedAt: new Date(),
    }).returning();
    return class_;
  }

  async updateClass(id: string, updates: Partial<InsertClass>): Promise<Class | undefined> {
    const [updated] = await db.update(classes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(classes.id, id))
      .returning();
    return updated;
  }

  async deleteClass(id: string): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  async getClassById(id: string): Promise<Class | undefined> {
    const [class_] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return class_;
  }

  async getClassesByUserId(userId: string): Promise<Class[]> {
    return await db.select().from(classes)
      .where(eq(classes.userId, userId))
      .orderBy(desc(classes.createdAt));
  }

  // Class enrollment methods
  async createClassEnrollment(enrollment: InsertClassEnrollment): Promise<ClassEnrollment> {
    const [enrollment_] = await db.insert(classEnrollments).values(enrollment).returning();
    return enrollment_;
  }

  async deleteClassEnrollment(classId: string, userId: string): Promise<void> {
    await db.delete(classEnrollments)
      .where(and(eq(classEnrollments.classId, classId), eq(classEnrollments.userId, userId)));
  }

  async getClassEnrollments(classId: string): Promise<any[]> {
    const enrollments = await db
      .select({
        enrollmentId: classEnrollments.id,
        userId: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        role: profiles.role,
        enrolledAt: classEnrollments.enrolledAt,
      })
      .from(classEnrollments)
      .innerJoin(profiles, eq(classEnrollments.userId, profiles.id))
      .where(eq(classEnrollments.classId, classId))
      .orderBy(desc(classEnrollments.enrolledAt));
    
    return enrollments;
  }

  async getStudentClasses(userId: string): Promise<Class[]> {
    const studentClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        description: classes.description,
        userId: classes.userId,
        subject: classes.subject,
        gradeLevel: classes.gradeLevel,
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt,
      })
      .from(classEnrollments)
      .innerJoin(classes, eq(classEnrollments.classId, classes.id))
      .where(eq(classEnrollments.userId, userId))
      .orderBy(desc(classes.createdAt));
    
    return studentClasses;
  }

  async bulkCreateEnrollments(enrollments: InsertClassEnrollment[]): Promise<ClassEnrollment[]> {
    if (enrollments.length === 0) return [];
    const results = await db.insert(classEnrollments).values(enrollments).returning();
    return results;
  }

  // Content assignment methods
  async createContentAssignment(assignment: InsertContentAssignment): Promise<ContentAssignment> {
    const [assignment_] = await db.insert(contentAssignments).values(assignment).returning();
    return assignment_;
  }

  async deleteContentAssignment(contentId: string, classId: string): Promise<void> {
    await db.delete(contentAssignments)
      .where(and(eq(contentAssignments.contentId, contentId), eq(contentAssignments.classId, classId)));
  }

  async getContentAssignments(contentId: string): Promise<any[]> {
    const assignments = await db
      .select({
        assignmentId: contentAssignments.id,
        classId: classes.id,
        className: classes.name,
        classDescription: classes.description,
        assignedAt: contentAssignments.assignedAt,
        dueDate: contentAssignments.dueDate,
        instructions: contentAssignments.instructions,
      })
      .from(contentAssignments)
      .innerJoin(classes, eq(contentAssignments.classId, classes.id))
      .where(eq(contentAssignments.contentId, contentId))
      .orderBy(desc(contentAssignments.assignedAt));
    
    return assignments;
  }

  async getClassAssignments(classId: string): Promise<any[]> {
    const assignments = await db
      .select({
        assignmentId: contentAssignments.id,
        contentId: h5pContent.id,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        assignedAt: contentAssignments.assignedAt,
        dueDate: contentAssignments.dueDate,
        instructions: contentAssignments.instructions,
      })
      .from(contentAssignments)
      .innerJoin(h5pContent, eq(contentAssignments.contentId, h5pContent.id))
      .where(eq(contentAssignments.classId, classId))
      .orderBy(desc(contentAssignments.assignedAt));
    
    return assignments;
  }

  async getStudentAssignments(userId: string): Promise<any[]> {
    // Get all classes the student is enrolled in
    const studentClassIds = await db
      .select({ classId: classEnrollments.classId })
      .from(classEnrollments)
      .where(eq(classEnrollments.userId, userId));
    
    if (studentClassIds.length === 0) return [];
    
    const classIds = studentClassIds.map(c => c.classId);
    
    // Get all assignments for those classes
    const assignments = await db
      .select({
        assignmentId: contentAssignments.id,
        contentId: h5pContent.id,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        classId: classes.id,
        className: classes.name,
        assignedAt: contentAssignments.assignedAt,
        dueDate: contentAssignments.dueDate,
        instructions: contentAssignments.instructions,
      })
      .from(contentAssignments)
      .innerJoin(h5pContent, eq(contentAssignments.contentId, h5pContent.id))
      .innerJoin(classes, eq(contentAssignments.classId, classes.id))
      .where(inArray(contentAssignments.classId, classIds))
      .orderBy(desc(contentAssignments.assignedAt));
    
    return assignments;
  }
}

export const storage = new DbStorage();
