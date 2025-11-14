import { db } from "../db";
import { profiles, h5pContent, contentShares, learnerProgress, quizAttempts, interactionEvents } from "@shared/schema";
import type { 
  Profile, InsertProfile, 
  H5pContent, InsertH5pContent, 
  ContentShare, InsertContentShare,
  LearnerProgress, InsertLearnerProgress,
  QuizAttempt, InsertQuizAttempt,
  InteractionEvent, InsertInteractionEvent
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Profile methods
  createProfile(profile: InsertProfile): Promise<Profile>;
  getProfileById(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  
  // Content methods
  createContent(content: InsertH5pContent): Promise<H5pContent>;
  updateContent(id: string, updates: Partial<InsertH5pContent>): Promise<H5pContent | undefined>;
  deleteContent(id: string): Promise<void>;
  getContentById(id: string): Promise<H5pContent | undefined>;
  getContentByUserId(userId: string): Promise<H5pContent[]>;
  getPublishedContent(id: string): Promise<H5pContent | undefined>;
  
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
}

export class DbStorage implements IStorage {
  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const hashedPassword = await bcrypt.hash(insertProfile.password, 10);
    const [profile] = await db
      .insert(profiles)
      .values({ ...insertProfile, password: hashedPassword })
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

  async getContentByUserId(userId: string): Promise<H5pContent[]> {
    return await db.select().from(h5pContent).where(eq(h5pContent.userId, userId));
  }

  async getPublishedContent(id: string): Promise<H5pContent | undefined> {
    const [content] = await db
      .select()
      .from(h5pContent)
      .where(and(eq(h5pContent.id, id), eq(h5pContent.isPublished, true)))
      .limit(1);
    return content;
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
}

export const storage = new DbStorage();
