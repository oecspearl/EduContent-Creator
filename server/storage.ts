/**
 * Storage facade — delegates to domain-specific repositories.
 *
 * All route code imports `storage` from here and calls methods on the
 * IStorage interface. Internally each method forwards to the correct
 * repository. Over time, routes can inject repositories directly and
 * this facade can be removed.
 */

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
  ContentAssignment, InsertContentAssignment,
} from "@shared/schema";
import { h5pContent } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import type {
  ContentAnalytics,
  ContentOverviewAnalytics,
  ContentLearner,
  QuestionAnalytics,
  PerformanceDistribution,
  ScoreDistribution,
  ClassEnrollmentInfo,
  ContentAssignmentInfo,
} from "./types/analytics";

import { ProfileRepository } from "./repositories/profile-repository";
import { ContentRepository } from "./repositories/content-repository";
import { AnalyticsRepository } from "./repositories/analytics-repository";
import { ChatRepository } from "./repositories/chat-repository";
import { ClassRepository } from "./repositories/class-repository";

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
  getContentAnalytics(contentId: string): Promise<ContentAnalytics | null>;
  getUserContentAnalytics(userId: string): Promise<ContentOverviewAnalytics[]>;
  getContentLearners(contentId: string): Promise<ContentLearner[]>;
  getQuestionAnalytics(contentId: string): Promise<QuestionAnalytics>;
  getStudentPerformanceDistribution(contentId: string): Promise<PerformanceDistribution>;
  getScoreDistribution(contentId: string): Promise<ScoreDistribution>;
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
  getClassEnrollments(classId: string): Promise<ClassEnrollmentInfo[]>;
  getStudentClasses(userId: string): Promise<Class[]>;
  bulkCreateEnrollments(enrollments: InsertClassEnrollment[]): Promise<ClassEnrollment[]>;

  // Content assignment methods
  createContentAssignment(assignment: InsertContentAssignment): Promise<ContentAssignment>;
  deleteContentAssignment(contentId: string, classId: string): Promise<void>;
  getContentAssignments(contentId: string): Promise<ContentAssignmentInfo[]>;
  getClassAssignments(classId: string): Promise<ContentAssignmentInfo[]>;
  getStudentAssignments(userId: string): Promise<ContentAssignmentInfo[]>;
}

export class DbStorage implements IStorage {
  private profileRepo = new ProfileRepository();
  private contentRepo = new ContentRepository();
  private analyticsRepo = new AnalyticsRepository();
  private chatRepo = new ChatRepository();
  private classRepo = new ClassRepository();

  // ─── Profile ─────────────────────────────────────────────
  createProfile(profile: InsertProfile) { return this.profileRepo.create(profile); }
  updateProfile(id: string, updates: Partial<InsertProfile>) { return this.profileRepo.update(id, updates); }
  getProfileById(id: string) { return this.profileRepo.getById(id); }
  getProfileByEmail(email: string) { return this.profileRepo.getByEmail(email); }
  setPasswordResetToken(email: string, token: string, expiresAt: Date) { return this.profileRepo.setPasswordResetToken(email, token, expiresAt); }
  getProfileByResetToken(token: string) { return this.profileRepo.getByResetToken(token); }
  clearPasswordResetToken(id: string) { return this.profileRepo.clearPasswordResetToken(id); }

  // ─── Content ─────────────────────────────────────────────
  createContent(content: InsertH5pContent) { return this.contentRepo.create(content); }
  updateContent(id: string, updates: Partial<InsertH5pContent>) { return this.contentRepo.update(id, updates); }
  deleteContent(id: string) { return this.contentRepo.delete(id); }
  getContentById(id: string) { return this.contentRepo.getById(id); }
  getContentByUserId(userId: string, limit?: number) { return this.contentRepo.getByUserId(userId, limit); }
  getPublishedContent(id: string) { return this.contentRepo.getPublished(id); }
  getPublicContent() { return this.contentRepo.getPublic(); }
  copyContent(contentId: string, userId: string) { return this.contentRepo.copy(contentId, userId); }
  createShare(share: InsertContentShare) { return this.contentRepo.createShare(share); }
  getSharesByContentId(contentId: string) { return this.contentRepo.getSharesByContentId(contentId); }

  // ─── Analytics / Progress ────────────────────────────────
  upsertLearnerProgress(progress: InsertLearnerProgress) { return this.analyticsRepo.upsertLearnerProgress(progress); }
  getLearnerProgress(userId: string, contentId: string) { return this.analyticsRepo.getLearnerProgress(userId, contentId); }
  getUserProgressByContentId(contentId: string) { return this.analyticsRepo.getUserProgressByContentId(contentId); }
  getAllUserProgress(userId: string) { return this.analyticsRepo.getAllUserProgress(userId); }
  createQuizAttempt(attempt: InsertQuizAttempt) { return this.analyticsRepo.createQuizAttempt(attempt); }
  getQuizAttempts(userId: string, contentId: string) { return this.analyticsRepo.getQuizAttempts(userId, contentId); }
  createInteractionEvent(event: InsertInteractionEvent) { return this.analyticsRepo.createInteractionEvent(event); }
  getInteractionEvents(userId: string, contentId: string) { return this.analyticsRepo.getInteractionEvents(userId, contentId); }
  getAllQuizAttemptsForContent(contentId: string) { return this.analyticsRepo.getAllQuizAttemptsForContent(contentId); }

  async getContentAnalytics(contentId: string) {
    const content = await this.contentRepo.getById(contentId);
    return this.analyticsRepo.getContentAnalytics(contentId, content);
  }

  async getUserContentAnalytics(userId: string) {
    const userContent = await this.contentRepo.getByUserId(userId);
    return this.analyticsRepo.getUserContentAnalytics(userContent);
  }

  getContentLearners(contentId: string) { return this.analyticsRepo.getContentLearners(contentId); }
  getQuestionAnalytics(contentId: string) { return this.analyticsRepo.getQuestionAnalytics(contentId); }
  getStudentPerformanceDistribution(contentId: string) { return this.analyticsRepo.getStudentPerformanceDistribution(contentId); }
  getScoreDistribution(contentId: string) { return this.analyticsRepo.getScoreDistribution(contentId); }

  async getRecentStudentActivity(teacherId: string, limit: number = 10) {
    const teacherContent = await db
      .select({ id: h5pContent.id })
      .from(h5pContent)
      .where(eq(h5pContent.userId, teacherId));
    return this.analyticsRepo.getRecentStudentActivity(teacherContent.map(c => c.id), limit);
  }

  // ─── Chat ────────────────────────────────────────────────
  createChatMessage(message: InsertChatMessage) { return this.chatRepo.create(message); }
  getChatHistory(userId: string, limit?: number) { return this.chatRepo.getHistory(userId, limit); }
  deleteChatHistory(userId: string) { return this.chatRepo.deleteHistory(userId); }

  // ─── Classes ─────────────────────────────────────────────
  createClass(classData: InsertClass) { return this.classRepo.create(classData); }
  updateClass(id: string, updates: Partial<InsertClass>) { return this.classRepo.update(id, updates); }
  deleteClass(id: string) { return this.classRepo.delete(id); }
  getClassById(id: string) { return this.classRepo.getById(id); }
  getClassesByUserId(userId: string) { return this.classRepo.getByUserId(userId); }
  createClassEnrollment(enrollment: InsertClassEnrollment) { return this.classRepo.createEnrollment(enrollment); }
  deleteClassEnrollment(classId: string, userId: string) { return this.classRepo.deleteEnrollment(classId, userId); }
  getClassEnrollments(classId: string) { return this.classRepo.getEnrollments(classId); }
  getStudentClasses(userId: string) { return this.classRepo.getStudentClasses(userId); }
  bulkCreateEnrollments(enrollments: InsertClassEnrollment[]) { return this.classRepo.bulkCreateEnrollments(enrollments); }
  createContentAssignment(assignment: InsertContentAssignment) { return this.classRepo.createAssignment(assignment); }
  deleteContentAssignment(contentId: string, classId: string) { return this.classRepo.deleteAssignment(contentId, classId); }
  getContentAssignments(contentId: string) { return this.classRepo.getContentAssignments(contentId); }
  getClassAssignments(classId: string) { return this.classRepo.getClassAssignments(classId); }
  getStudentAssignments(userId: string) { return this.classRepo.getStudentAssignments(userId); }
}

export const storage = new DbStorage();
