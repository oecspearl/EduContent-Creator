/**
 * Barrel file — re-exports all schema definitions from domain-specific modules.
 *
 * Existing imports like `from "@shared/schema"` continue to work unchanged.
 * New code can import directly from the sub-modules for clarity:
 *   - `@shared/schemas/tables`         — Drizzle table definitions
 *   - `@shared/schemas/content-types`  — Domain type definitions
 *   - `@shared/schemas/api-schemas`    — Zod validation & insert schemas
 */

// Database tables
export {
  profiles,
  h5pContent,
  contentShares,
  learnerProgress,
  quizAttempts,
  interactionEvents,
  chatMessages,
  classes,
  classEnrollments,
  contentAssignments,
  studentAssignments,
  auditLog,
  notifications,
  learningPaths,
  learningPathItems,
  studentGroups,
  studentGroupMembers,
  messages,
  rubrics,
  rubricScores,
  contentReviews,
} from "./schemas/tables";

// Insert schemas & API request schemas
export {
  insertProfileSchema,
  insertH5pContentSchema,
  insertContentShareSchema,
  insertLearnerProgressSchema,
  insertQuizAttemptSchema,
  insertInteractionEventSchema,
  insertChatMessageSchema,
  insertClassSchema,
  insertClassEnrollmentSchema,
  insertContentAssignmentSchema,
  curriculumContextSchema,
  presentationGenerationSchema,
  aiGenerationSchema,
  videoFinderPedagogySchema,
  interactiveVideoGenerationSchema,
  chatRequestSchema,
  unsplashSearchSchema,
  youtubeSimpleSearchSchema,
  youtubeFullSearchSchema,
  aiImageGenerationSchema,
} from "./schemas/api-schemas";

// Content type definitions
export type {
  ContentType,
  QuizQuestion,
  QuizData,
  FlashcardData,
  VideoHotspot,
  InteractiveVideoData,
  ImageHotspot,
  ImageHotspotData,
  DragItem,
  DropZone,
  DragAndDropData,
  BlankItem,
  FillInBlanksData,
  MemoryCard,
  MemoryGameData,
  BookPageType,
  VideoPageData,
  QuizPageData,
  ImagePageData,
  BookPage,
  InteractiveBookData,
  VideoResult,
  VideoFinderData,
  SlideContent,
  PresentationData,
} from "./schemas/content-types";

// Inferred types from insert schemas
import { z } from "zod";
import type {
  profiles, h5pContent, contentShares, learnerProgress,
  quizAttempts, interactionEvents, chatMessages,
  classes, classEnrollments, contentAssignments,
} from "./schemas/tables";
import type {
  insertProfileSchema, insertH5pContentSchema, insertContentShareSchema,
  insertLearnerProgressSchema, insertQuizAttemptSchema, insertInteractionEventSchema,
  insertChatMessageSchema, insertClassSchema, insertClassEnrollmentSchema,
  insertContentAssignmentSchema, curriculumContextSchema, presentationGenerationSchema,
  aiGenerationSchema, videoFinderPedagogySchema, interactiveVideoGenerationSchema,
  chatRequestSchema,
} from "./schemas/api-schemas";

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type H5pContent = typeof h5pContent.$inferSelect;
export type InsertH5pContent = z.infer<typeof insertH5pContentSchema>;
export type ContentShare = typeof contentShares.$inferSelect;
export type InsertContentShare = z.infer<typeof insertContentShareSchema>;
export type LearnerProgress = typeof learnerProgress.$inferSelect;
export type InsertLearnerProgress = z.infer<typeof insertLearnerProgressSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type InteractionEvent = typeof interactionEvents.$inferSelect;
export type InsertInteractionEvent = z.infer<typeof insertInteractionEventSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type InsertClassEnrollment = z.infer<typeof insertClassEnrollmentSchema>;
export type ContentAssignment = typeof contentAssignments.$inferSelect;
export type InsertContentAssignment = z.infer<typeof insertContentAssignmentSchema>;

export type CurriculumContext = z.infer<typeof curriculumContextSchema>;
export type PresentationGenerationRequest = z.infer<typeof presentationGenerationSchema>;
export type AIGenerationRequest = z.infer<typeof aiGenerationSchema>;
export type VideoFinderPedagogyRequest = z.infer<typeof videoFinderPedagogySchema>;
export type InteractiveVideoGenerationRequest = z.infer<typeof interactiveVideoGenerationSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
