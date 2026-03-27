import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, timestamp, integer, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Profiles table
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"), // Nullable for OAuth users
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("teacher"),
  institution: text("institution"),
  authProvider: text("auth_provider").default("email"), // 'email' | 'google' | 'microsoft'
  googleId: text("google_id"),
  microsoftId: text("microsoft_id"),
  googleAccessToken: text("google_access_token"), // For Google Slides API access
  googleRefreshToken: text("google_refresh_token"), // For refreshing access tokens
  googleTokenExpiry: timestamp("google_token_expiry"), // When the access token expires
  passwordResetToken: text("password_reset_token"), // Token for password reset
  passwordResetExpiry: timestamp("password_reset_expiry"), // When the reset token expires
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
  isPublic: boolean("is_public").default(false).notNull(), // Share with other teachers
  tags: text("tags").array(),
  subject: text("subject"), // Subject area
  gradeLevel: text("grade_level"), // Grade level
  ageRange: text("age_range"), // Age range
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

// Chat messages table - stores AI assistant conversation history
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  context: jsonb("context"), // User's current context (page, content being viewed, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Classes table - stores class/group information
export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }), // Teacher who created the class
  subject: text("subject"), // Optional subject area
  gradeLevel: text("grade_level"), // Optional grade level
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Class enrollments table - many-to-many relationship between students and classes
export const classEnrollments = pgTable("class_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }), // Student enrolled in class
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
}, (table) => ({
  uniqueClassUser: unique().on(table.classId, table.userId),
}));

// Content assignments table - assigns content to classes
export const contentAssignments = pgTable("content_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  dueDate: timestamp("due_date"), // Optional due date
  instructions: text("instructions"), // Optional instructions for students
}, (table) => ({
  uniqueContentClass: unique().on(table.contentId, table.classId),
}));

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

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  context: z.record(z.any()).optional().nullable(),
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
});

export const insertClassEnrollmentSchema = createInsertSchema(classEnrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertContentAssignmentSchema = createInsertSchema(contentAssignments).omit({
  id: true,
  assignedAt: true,
}).extend({
  dueDate: z.date().optional().nullable(),
  instructions: z.string().optional().nullable(),
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
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type InsertClassEnrollment = z.infer<typeof insertClassEnrollmentSchema>;
export type ContentAssignment = typeof contentAssignments.$inferSelect;
export type InsertContentAssignment = z.infer<typeof insertContentAssignmentSchema>;

// Content type definitions
export type ContentType = "quiz" | "flashcard" | "interactive-video" | "image-hotspot" | "drag-drop" | "fill-blanks" | "memory-game" | "interactive-book" | "video-finder" | "presentation";

export type QuizQuestion = {
  id: string;
  type: "multiple-choice" | "true-false" | "fill-blank" | "ordering" | "drag-drop";
  question: string;
  imageUrl?: string; // Optional image for the question
  imageAlt?: string; // Alt text for the question image (accessibility)
  options?: string[]; // for multiple-choice
  correctAnswer: string | number | string[] | Record<string, string>; // index for multiple-choice, "true"/"false" for true-false, string for fill-blank, array of items in order for ordering, Record<itemId, zoneId> for drag-drop
  explanation?: string;
  // For ordering questions
  items?: string[]; // List of items to be ordered
  // For drag-drop questions
  zones?: Array<{ id: string; label: string }>; // Drop zones/categories
  dragItems?: Array<{ id: string; content: string; correctZone: string }>; // Items to drag
  caseSensitive?: boolean; // For fill-blank questions
  acceptableAnswers?: string[]; // For fill-blank questions (multiple correct answers)
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
    frontImageUrl?: string;
    backImageUrl?: string;
    frontImageAlt?: string;
    backImageAlt?: string;
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
  type: "question" | "quiz" | "info" | "navigation";
  title: string;
  content: string;
  // For single question hotspots
  options?: string[]; // for question hotspots
  correctAnswer?: number; // for question hotspots
  // For quiz hotspots (multiple questions)
  questions?: QuizQuestion[]; // for quiz hotspots
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

// Drag and Drop types
export type DragItem = {
  id: string;
  content: string;
  correctZone: string; // ID of the correct drop zone
};

export type DropZone = {
  id: string;
  label: string;
  allowMultiple: boolean;
};

export type DragAndDropData = {
  items: DragItem[];
  zones: DropZone[];
  settings: {
    showZoneLabels: boolean;
    instantFeedback: boolean;
    allowRetry: boolean;
  };
};

// Fill in the Blanks types
export type BlankItem = {
  id: string;
  correctAnswers: string[]; // Multiple acceptable answers
  caseSensitive: boolean;
  showHint?: string;
};

export type FillInBlanksData = {
  text: string; // Text with __blank__ or *blank* markers
  blanks: BlankItem[]; // Array indexed to match blank positions
  settings: {
    caseSensitive: boolean;
    showHints: boolean;
    allowRetry: boolean;
  };
};

// Memory Game types
export type MemoryCard = {
  id: string;
  content: string;
  matchId: string; // Cards with same matchId are pairs
  type: "text" | "image";
  imageUrl?: string;
};

export type MemoryGameData = {
  cards: MemoryCard[];
  settings: {
    rows: number;
    columns: number;
    showTimer: boolean;
    showMoves: boolean;
  };
};

// Interactive Book types
export type BookPageType = "content" | "video" | "quiz" | "image";

export type VideoPageData = {
  videoId: string; // YouTube video ID
  videoUrl: string; // Full YouTube URL
  title: string;
  description?: string;
  thumbnailUrl?: string;
  instructions?: string; // Instructions for viewing the video
};

export type QuizPageData = {
  questions: QuizQuestion[];
  settings: {
    shuffleQuestions: boolean;
    showCorrectAnswers: boolean;
    allowRetry: boolean;
    timeLimit?: number; // in minutes
  };
};

export type ImagePageData = {
  imageUrl: string;
  imageAlt?: string;
  instructions?: string; // Instructions about the image
  source?: "upload" | "url" | "puterjs" | "dalle"; // How the image was added
};

export type BookPage = {
  id: string;
  title: string;
  pageType?: BookPageType; // Defaults to "content" for backward compatibility
  content: string; // Rich text/HTML content (for content pages)
  // Page-specific data
  videoData?: VideoPageData; // For video pages
  quizData?: QuizPageData; // For quiz pages
  imageData?: ImagePageData; // For image pages
  audioUrl?: string; // Base64 encoded audio for voice narration
  embeddedContentId?: string; // Reference to h5pContent.id (new format)
  // Legacy format (backward compatibility)
  embeddedContent?: {
    type: ContentType;
    data: QuizData | FlashcardData | InteractiveVideoData | ImageHotspotData | DragAndDropData | FillInBlanksData | MemoryGameData;
  };
};

export type InteractiveBookData = {
  pages: BookPage[];
  subject?: string; // Subject area (e.g., "Mathematics", "Science", "Language Arts")
  gradeLevel?: string; // Grade level (e.g., "Grade 5", "Grade 6-8")
  settings: {
    showNavigation: boolean;
    showProgress: boolean;
    requireCompletion: boolean; // Must complete embedded activities to proceed
  };
};

// Video Finder types
export type VideoResult = {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
};

export type VideoFinderData = {
  searchCriteria: {
    subject: string;
    topic: string;
    learningOutcome: string;
    gradeLevel: string;
    ageRange: string;
    videoCount: number;
  };
  searchResults: VideoResult[];
  searchDate: string;
  viewingInstructions?: string; // Pedagogical guidance for learners
  guidingQuestions?: string[]; // Questions to focus learning
};

// Presentation types
export type SlideContent = {
  id: string;
  type: "title" | "content" | "guiding-questions" | "reflection" | "image";
  title?: string;
  content?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  imageAlt?: string;
  questions?: string[];
  notes?: string; // Speaker notes with pedagogical guidance
};

export type PresentationData = {
  topic: string;
  gradeLevel: string;
  ageRange: string;
  learningOutcomes: string[];
  customInstructions?: string; // Optional custom instructions from teacher
  slides: SlideContent[];
  presentationId?: string; // Google Slides presentation ID if created
  presentationUrl?: string; // Public URL to the presentation
  generatedDate: string;
  colorScheme?: string; // Color theme for presentation (e.g., "blue", "green", "purple", "orange")
  imageProvider?: "puterjs" | "unsplash"; // Image source for slides (defaults to puterjs)
};

// Presentation Generation request
export const presentationGenerationSchema = z.object({
  topic: z.string().min(1),
  gradeLevel: z.string().min(1),
  ageRange: z.string().min(1),
  learningOutcomes: z.array(z.string()).min(1).max(10),
  numberOfSlides: z.number().min(5).max(30).default(10),
  customInstructions: z.string().optional(), // Optional custom instructions from teacher
});

export type PresentationGenerationRequest = z.infer<typeof presentationGenerationSchema>;

// AI Generation request
export const aiGenerationSchema = z.object({
  contentType: z.enum(["quiz", "flashcard", "interactive-video", "image-hotspot", "drag-drop", "fill-blanks", "memory-game", "interactive-book"]),
  topic: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  gradeLevel: z.string().optional(),
  numberOfItems: z.number().min(1).max(20),
  language: z.string().default("English"),
  additionalContext: z.string().optional(),
  // For quiz content: question type preferences
  questionTypeMode: z.enum(["all-same", "mixed"]).optional(), // "all-same" = one type for all, "mixed" = specify per question
  questionType: z.enum(["multiple-choice", "true-false", "fill-blank", "ordering", "drag-drop"]).optional(), // For "all-same" mode
  questionTypes: z.array(z.enum(["multiple-choice", "true-false", "fill-blank", "ordering", "drag-drop"])).optional(), // For "mixed" mode - one per question
  numberOfOptions: z.number().min(2).max(6).optional(), // Number of options for multiple choice questions (default: 4)
});

export type AIGenerationRequest = z.infer<typeof aiGenerationSchema>;

// Video Finder Pedagogy Generation request
export const videoFinderPedagogySchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  learningOutcome: z.string().min(1),
  gradeLevel: z.string().min(1),
  ageRange: z.string().optional(),
  videoCount: z.number().min(1).max(50),
});

export type VideoFinderPedagogyRequest = z.infer<typeof videoFinderPedagogySchema>;
