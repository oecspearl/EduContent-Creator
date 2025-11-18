import { db } from "../db";
import { profiles, h5pContent, contentShares, learnerProgress, quizAttempts, interactionEvents, chatMessages } from "@shared/schema";
import type { 
  Profile, InsertProfile, 
  H5pContent, InsertH5pContent, 
  ContentShare, InsertContentShare,
  LearnerProgress, InsertLearnerProgress,
  QuizAttempt, InsertQuizAttempt,
  InteractionEvent, InsertInteractionEvent,
  ChatMessage, InsertChatMessage
} from "@shared/schema";
import { eq, and, desc, sql, count, avg, sum } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Profile methods
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, updates: Partial<InsertProfile>): Promise<Profile | undefined>;
  getProfileById(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  
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
  
  // Chat message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;
  deleteChatHistory(userId: string): Promise<void>;
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
    const [profile] = await db
      .update(profiles)
      .set(updates)
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
}

export const storage = new DbStorage();
