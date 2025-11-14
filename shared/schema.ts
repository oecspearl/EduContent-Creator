import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, timestamp, integer, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Profiles table
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("teacher"),
  institution: text("institution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// H5P Content table
export const h5pContent = pgTable("h5p_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'quiz' | 'flashcard' | 'interactive-video' | 'image-hotspot'
  data: jsonb("data").notNull(), // stores full content structure
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  isPublished: boolean("is_published").default(false).notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content shares table
export const contentShares = pgTable("content_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  sharedBy: varchar("shared_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Learner progress table - tracks overall completion for each content item
export const learnerProgress = pgTable("learner_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  completionPercentage: real("completion_percentage").notNull().default(0), // 0-100
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserContent: unique().on(table.userId, table.contentId),
}));

// Quiz attempts table - stores individual quiz attempt details
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // Number of correct answers
  totalQuestions: integer("total_questions").notNull(),
  answers: jsonb("answers").notNull(), // Array of {questionId, answer, isCorrect}
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

// Interaction events table - stores granular interaction data
export const interactionEvents = pgTable("interaction_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // 'card_flipped', 'hotspot_completed', 'video_paused', etc.
  eventData: jsonb("event_data"), // Additional contextual data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas
export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertH5pContentSchema = createInsertSchema(h5pContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentShareSchema = createInsertSchema(contentShares).omit({
  id: true,
  createdAt: true,
});

export const insertLearnerProgressSchema = createInsertSchema(learnerProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  completionPercentage: z.number().min(0).max(100),
  completedAt: z.date().optional().nullable(),
  lastAccessedAt: z.date(),
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  completedAt: true,
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
  id: true,
  createdAt: true,
}).extend({
  eventType: z.string().min(1),
  eventData: z.record(z.any()).optional().nullable(),
});

// Types
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

// Content type definitions
export type ContentType = "quiz" | "flashcard" | "interactive-video" | "image-hotspot";

export type QuizQuestion = {
  id: string;
  type: "multiple-choice" | "true-false" | "fill-blank";
  question: string;
  options?: string[]; // for multiple-choice
  correctAnswer: string | number; // index for multiple-choice, "true"/"false" for true-false, string for fill-blank
  explanation?: string;
};

export type QuizData = {
  questions: QuizQuestion[];
  settings: {
    shuffleQuestions: boolean;
    showCorrectAnswers: boolean;
    allowRetry: boolean;
    timeLimit?: number; // in minutes
  };
};

export type FlashcardData = {
  cards: Array<{
    id: string;
    front: string;
    back: string;
    category?: string;
  }>;
  settings: {
    shuffleCards: boolean;
    showProgress: boolean;
    autoFlipDelay?: number; // in seconds
  };
};

export type VideoHotspot = {
  id: string;
  timestamp: number; // in seconds
  type: "question" | "info" | "navigation";
  title: string;
  content: string;
  options?: string[]; // for question hotspots
  correctAnswer?: number; // for question hotspots
};

export type InteractiveVideoData = {
  videoUrl: string; // YouTube URL
  hotspots: VideoHotspot[];
};

export type ImageHotspot = {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  title: string;
  description: string;
};

export type ImageHotspotData = {
  imageUrl: string;
  hotspots: ImageHotspot[];
};

// AI Generation request
export const aiGenerationSchema = z.object({
  contentType: z.enum(["quiz", "flashcard", "interactive-video", "image-hotspot"]),
  topic: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  gradeLevel: z.string().optional(),
  numberOfItems: z.number().min(1).max(20),
  language: z.string().default("English"),
  additionalContext: z.string().optional(),
});

export type AIGenerationRequest = z.infer<typeof aiGenerationSchema>;
