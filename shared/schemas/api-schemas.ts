/**
 * Zod validation schemas for API requests.
 */
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import {
  profiles, h5pContent, contentShares, learnerProgress,
  quizAttempts, interactionEvents, chatMessages,
  classes, classEnrollments, contentAssignments,
} from "./tables";

// ─── Insert schemas (from Drizzle tables) ──────────────────

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const insertH5pContentSchema = createInsertSchema(h5pContent).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const insertContentShareSchema = createInsertSchema(contentShares).omit({
  id: true, createdAt: true,
});

export const insertLearnerProgressSchema = createInsertSchema(learnerProgress).omit({
  id: true, createdAt: true, updatedAt: true,
}).extend({
  completionPercentage: z.number().min(0).max(100),
  completedAt: z.date().optional().nullable(),
  lastAccessedAt: z.date(),
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true, completedAt: true,
}).extend({
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.number(), z.boolean()]),
    isCorrect: z.boolean(),
  })),
});

export const insertInteractionEventSchema = createInsertSchema(interactionEvents).omit({
  id: true, createdAt: true,
}).extend({
  eventType: z.string().min(1),
  eventData: z.record(z.any()).optional().nullable(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true, createdAt: true,
}).extend({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  context: z.record(z.any()).optional().nullable(),
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true, createdAt: true, updatedAt: true,
}).extend({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
});

export const insertClassEnrollmentSchema = createInsertSchema(classEnrollments).omit({
  id: true, enrolledAt: true,
});

export const insertContentAssignmentSchema = createInsertSchema(contentAssignments).omit({
  id: true, assignedAt: true,
}).extend({
  dueDate: z.date().optional().nullable(),
  instructions: z.string().optional().nullable(),
});

// ─── Curriculum context (shared across generation schemas) ─

export const curriculumContextSchema = z.object({
  subject: z.string(),
  grade: z.string(),
  strand: z.string(),
  eloText: z.string(),
  scoTexts: z.array(z.string()).optional(),
});

// ─── API request schemas ───────────────────────────────────

export const presentationGenerationSchema = z.object({
  topic: z.string().min(1),
  gradeLevel: z.string().min(1),
  ageRange: z.string().min(1),
  learningOutcomes: z.array(z.string()).min(1).max(10),
  numberOfSlides: z.number().min(5).max(30).default(10),
  customInstructions: z.string().optional(),
  curriculumContext: curriculumContextSchema.optional(),
});

export const aiGenerationSchema = z.object({
  contentType: z.enum(["quiz", "flashcard", "interactive-video", "image-hotspot", "drag-drop", "fill-blanks", "memory-game", "interactive-book"]),
  topic: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  gradeLevel: z.string().optional(),
  numberOfItems: z.number().min(1).max(20),
  language: z.string().default("English"),
  additionalContext: z.string().optional(),
  questionTypeMode: z.enum(["all-same", "mixed"]).optional(),
  questionType: z.enum(["multiple-choice", "true-false", "fill-blank", "ordering", "drag-drop"]).optional(),
  questionTypes: z.array(z.enum(["multiple-choice", "true-false", "fill-blank", "ordering", "drag-drop"])).optional(),
  numberOfOptions: z.number().min(2).max(6).optional(),
  curriculumContext: curriculumContextSchema.optional(),
});

export const videoFinderPedagogySchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  learningOutcome: z.string().min(1),
  gradeLevel: z.string().min(1),
  ageRange: z.string().optional(),
  videoCount: z.number().min(1).max(50),
});

export const interactiveVideoGenerationSchema = z.object({
  topic: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  numberOfHotspots: z.number().min(1).max(20).default(5),
  gradeLevel: z.string().optional(),
  additionalContext: z.string().optional(),
  videoId: z.string().min(1),
  videoTitle: z.string().optional(),
  videoDescription: z.string().optional(),
  videoDuration: z.string().optional(),
  videoTags: z.array(z.string()).optional(),
  channelTitle: z.string().optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  context: z.record(z.any()).optional().nullable(),
});

export const unsplashSearchSchema = z.object({
  query: z.string().min(1),
  count: z.number().min(1).max(30).default(1),
});

export const youtubeSimpleSearchSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(1).max(50).default(10),
});

export const youtubeFullSearchSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  learningOutcome: z.string().min(1),
  gradeLevel: z.string().min(1),
  ageRange: z.string().optional(),
  videoCount: z.number().min(1).max(50),
});

export const aiImageGenerationSchema = z.object({
  prompt: z.string().min(1).max(2000),
});
