import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiGenerationSchema: () => aiGenerationSchema,
  chatMessages: () => chatMessages,
  classEnrollments: () => classEnrollments,
  classes: () => classes,
  contentAssignments: () => contentAssignments,
  contentShares: () => contentShares,
  h5pContent: () => h5pContent,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertClassEnrollmentSchema: () => insertClassEnrollmentSchema,
  insertClassSchema: () => insertClassSchema,
  insertContentAssignmentSchema: () => insertContentAssignmentSchema,
  insertContentShareSchema: () => insertContentShareSchema,
  insertH5pContentSchema: () => insertH5pContentSchema,
  insertInteractionEventSchema: () => insertInteractionEventSchema,
  insertLearnerProgressSchema: () => insertLearnerProgressSchema,
  insertProfileSchema: () => insertProfileSchema,
  insertQuizAttemptSchema: () => insertQuizAttemptSchema,
  interactionEvents: () => interactionEvents,
  learnerProgress: () => learnerProgress,
  presentationGenerationSchema: () => presentationGenerationSchema,
  profiles: () => profiles,
  quizAttempts: () => quizAttempts,
  videoFinderPedagogySchema: () => videoFinderPedagogySchema
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, timestamp, integer, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var profiles, h5pContent, contentShares, learnerProgress, quizAttempts, interactionEvents, chatMessages, classes, classEnrollments, contentAssignments, insertProfileSchema, insertH5pContentSchema, insertContentShareSchema, insertLearnerProgressSchema, insertQuizAttemptSchema, insertInteractionEventSchema, insertChatMessageSchema, insertClassSchema, insertClassEnrollmentSchema, insertContentAssignmentSchema, presentationGenerationSchema, aiGenerationSchema, videoFinderPedagogySchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    profiles = pgTable("profiles", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password"),
      // Nullable for OAuth users
      fullName: text("full_name").notNull(),
      role: text("role").notNull().default("teacher"),
      institution: text("institution"),
      authProvider: text("auth_provider").default("email"),
      // 'email' | 'google' | 'microsoft'
      googleId: text("google_id"),
      microsoftId: text("microsoft_id"),
      googleAccessToken: text("google_access_token"),
      // For Google Slides API access
      googleRefreshToken: text("google_refresh_token"),
      // For refreshing access tokens
      googleTokenExpiry: timestamp("google_token_expiry"),
      // When the access token expires
      passwordResetToken: text("password_reset_token"),
      // Token for password reset
      passwordResetExpiry: timestamp("password_reset_expiry"),
      // When the reset token expires
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    h5pContent = pgTable("h5p_content", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      description: text("description"),
      type: text("type").notNull(),
      // 'quiz' | 'flashcard' | 'interactive-video' | 'image-hotspot'
      data: jsonb("data").notNull(),
      // stores full content structure
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      isPublished: boolean("is_published").default(false).notNull(),
      isPublic: boolean("is_public").default(false).notNull(),
      // Share with other teachers
      tags: text("tags").array(),
      subject: text("subject"),
      // Subject area
      gradeLevel: text("grade_level"),
      // Grade level
      ageRange: text("age_range"),
      // Age range
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    contentShares = pgTable("content_shares", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      sharedBy: varchar("shared_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    learnerProgress = pgTable("learner_progress", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      completionPercentage: real("completion_percentage").notNull().default(0),
      // 0-100
      completedAt: timestamp("completed_at"),
      lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      uniqueUserContent: unique().on(table.userId, table.contentId)
    }));
    quizAttempts = pgTable("quiz_attempts", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      score: integer("score").notNull(),
      // Number of correct answers
      totalQuestions: integer("total_questions").notNull(),
      answers: jsonb("answers").notNull(),
      // Array of {questionId, answer, isCorrect}
      completedAt: timestamp("completed_at").defaultNow().notNull()
    });
    interactionEvents = pgTable("interaction_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      eventType: text("event_type").notNull(),
      // 'card_flipped', 'hotspot_completed', 'video_paused', etc.
      eventData: jsonb("event_data"),
      // Additional contextual data
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    chatMessages = pgTable("chat_messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      role: text("role").notNull(),
      // 'user' | 'assistant' | 'system'
      content: text("content").notNull(),
      context: jsonb("context"),
      // User's current context (page, content being viewed, etc.)
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    classes = pgTable("classes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      description: text("description"),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      // Teacher who created the class
      subject: text("subject"),
      // Optional subject area
      gradeLevel: text("grade_level"),
      // Optional grade level
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    classEnrollments = pgTable("class_enrollments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      // Student enrolled in class
      enrolledAt: timestamp("enrolled_at").defaultNow().notNull()
    }, (table) => ({
      uniqueClassUser: unique().on(table.classId, table.userId)
    }));
    contentAssignments = pgTable("content_assignments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
      assignedAt: timestamp("assigned_at").defaultNow().notNull(),
      dueDate: timestamp("due_date"),
      // Optional due date
      instructions: text("instructions")
      // Optional instructions for students
    }, (table) => ({
      uniqueContentClass: unique().on(table.contentId, table.classId)
    }));
    insertProfileSchema = createInsertSchema(profiles).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertH5pContentSchema = createInsertSchema(h5pContent).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertContentShareSchema = createInsertSchema(contentShares).omit({
      id: true,
      createdAt: true
    });
    insertLearnerProgressSchema = createInsertSchema(learnerProgress).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      completionPercentage: z.number().min(0).max(100),
      completedAt: z.date().optional().nullable(),
      lastAccessedAt: z.date()
    });
    insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
      id: true,
      completedAt: true
    }).extend({
      score: z.number().int().min(0),
      totalQuestions: z.number().int().min(1),
      answers: z.array(z.object({
        questionId: z.string(),
        answer: z.union([z.string(), z.number(), z.boolean()]),
        isCorrect: z.boolean()
      }))
    });
    insertInteractionEventSchema = createInsertSchema(interactionEvents).omit({
      id: true,
      createdAt: true
    }).extend({
      eventType: z.string().min(1),
      eventData: z.record(z.any()).optional().nullable()
    });
    insertChatMessageSchema = createInsertSchema(chatMessages).omit({
      id: true,
      createdAt: true
    }).extend({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(1),
      context: z.record(z.any()).optional().nullable()
    });
    insertClassSchema = createInsertSchema(classes).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      subject: z.string().optional().nullable(),
      gradeLevel: z.string().optional().nullable()
    });
    insertClassEnrollmentSchema = createInsertSchema(classEnrollments).omit({
      id: true,
      enrolledAt: true
    });
    insertContentAssignmentSchema = createInsertSchema(contentAssignments).omit({
      id: true,
      assignedAt: true
    }).extend({
      dueDate: z.date().optional().nullable(),
      instructions: z.string().optional().nullable()
    });
    presentationGenerationSchema = z.object({
      topic: z.string().min(1),
      gradeLevel: z.string().min(1),
      ageRange: z.string().min(1),
      learningOutcomes: z.array(z.string()).min(1).max(10),
      numberOfSlides: z.number().min(5).max(30).default(10),
      customInstructions: z.string().optional()
      // Optional custom instructions from teacher
    });
    aiGenerationSchema = z.object({
      contentType: z.enum(["quiz", "flashcard", "interactive-video", "image-hotspot", "drag-drop", "fill-blanks", "memory-game", "interactive-book"]),
      topic: z.string().min(1),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      gradeLevel: z.string().optional(),
      numberOfItems: z.number().min(1).max(20),
      language: z.string().default("English"),
      additionalContext: z.string().optional(),
      // For quiz content: question type preferences
      questionTypeMode: z.enum(["all-same", "mixed"]).optional(),
      // "all-same" = one type for all, "mixed" = specify per question
      questionType: z.enum(["multiple-choice", "true-false", "fill-blank", "ordering", "drag-drop"]).optional(),
      // For "all-same" mode
      questionTypes: z.array(z.enum(["multiple-choice", "true-false", "fill-blank", "ordering", "drag-drop"])).optional(),
      // For "mixed" mode - one per question
      numberOfOptions: z.number().min(2).max(6).optional()
      // Number of options for multiple choice questions (default: 4)
    });
    videoFinderPedagogySchema = z.object({
      subject: z.string().min(1),
      topic: z.string().min(1),
      learningOutcome: z.string().min(1),
      gradeLevel: z.string().min(1),
      ageRange: z.string().optional(),
      videoCount: z.number().min(1).max(50)
    });
  }
});

// db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
var pool, dbInstance, db;
var init_db = __esm({
  "db/index.ts"() {
    "use strict";
    init_schema();
    pool = null;
    dbInstance = null;
    if (process.env.DATABASE_URL) {
      const isSupabase = process.env.DATABASE_URL.includes("supabase");
      const isNeon = process.env.DATABASE_URL.includes("neon");
      let connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, "");
      pool = new Pool({
        connectionString,
        ssl: isSupabase || isNeon ? {
          rejectUnauthorized: false
        } : false,
        max: 20,
        idleTimeoutMillis: 3e4,
        connectionTimeoutMillis: 1e4
      });
      pool.on("error", (err) => {
        console.error("Unexpected error on idle PostgreSQL client", err);
      });
      dbInstance = drizzle(pool, { schema: schema_exports });
      console.log("\u2713 Database connection pool created");
      if (isSupabase) {
        console.log("\u2713 Using Supabase PostgreSQL database");
      } else if (isNeon) {
        console.log("\u2713 Using Neon PostgreSQL database");
      } else {
        console.log("\u2713 Using PostgreSQL database");
      }
    } else {
      console.warn("\u26A0 DATABASE_URL is not set. Database operations will not work.");
      console.warn("\u26A0 For full functionality, set DATABASE_URL in your .env file.");
      console.warn("\u26A0 The app will use memory session store, but data will not persist.");
    }
    db = new Proxy({}, {
      get(_target, prop) {
        if (!dbInstance) {
          throw new Error(
            "DATABASE_URL is not set. Please add DATABASE_URL to your .env file.\nGet a free PostgreSQL database from:\n  - Neon: https://neon.tech\n  - Supabase: https://supabase.com\nOr use a local PostgreSQL instance."
          );
        }
        return dbInstance[prop];
      }
    });
  }
});

// server/storage.ts
import { eq, and, desc, sql as sql2, count, avg, sum, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
var DbStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    init_schema();
    DbStorage = class {
      async createProfile(insertProfile) {
        const password = insertProfile.password ? insertProfile.password.startsWith("$2") ? insertProfile.password : await bcrypt.hash(insertProfile.password, 10) : null;
        const [profile] = await db.insert(profiles).values({ ...insertProfile, password }).returning();
        return profile;
      }
      async updateProfile(id, updates) {
        if (updates.password && typeof updates.password === "string" && !updates.password.startsWith("$2")) {
          updates.password = await bcrypt.hash(updates.password, 10);
        }
        const updateData = { ...updates };
        updateData.updatedAt = /* @__PURE__ */ new Date();
        const [profile] = await db.update(profiles).set(updateData).where(eq(profiles.id, id)).returning();
        return profile;
      }
      async getProfileById(id) {
        const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
        return profile;
      }
      async getProfileByEmail(email) {
        const [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
        return profile;
      }
      async setPasswordResetToken(email, token, expiresAt) {
        const [profile] = await db.update(profiles).set({
          passwordResetToken: token,
          passwordResetExpiry: expiresAt,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(profiles.email, email)).returning();
        return profile;
      }
      async getProfileByResetToken(token) {
        const [profile] = await db.select().from(profiles).where(eq(profiles.passwordResetToken, token)).limit(1);
        return profile;
      }
      async clearPasswordResetToken(id) {
        await db.update(profiles).set({
          passwordResetToken: null,
          passwordResetExpiry: null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(profiles.id, id));
      }
      async createContent(insertContent) {
        const [content] = await db.insert(h5pContent).values(insertContent).returning();
        return content;
      }
      async updateContent(id, updates) {
        const [content] = await db.update(h5pContent).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(h5pContent.id, id)).returning();
        return content;
      }
      async deleteContent(id) {
        await db.delete(h5pContent).where(eq(h5pContent.id, id));
      }
      async getContentById(id) {
        const [content] = await db.select().from(h5pContent).where(eq(h5pContent.id, id)).limit(1);
        return content;
      }
      async getContentByUserId(userId, limit) {
        try {
          console.log("[STORAGE] getContentByUserId called with userId:", userId);
          console.log("[STORAGE] Database instance exists:", !!db);
          const queryLimit = limit || 50;
          let query = db.select().from(h5pContent).where(eq(h5pContent.userId, userId)).orderBy(desc(h5pContent.updatedAt)).limit(queryLimit);
          const result = await query;
          console.log("[STORAGE] Query successful, returned", result.length, "items (limit:", queryLimit, ")");
          if (result.length === queryLimit) {
            console.warn("[STORAGE] Warning: Query returned maximum items. There may be more content.");
          }
          return result;
        } catch (error) {
          console.error("========================================");
          console.error("[STORAGE] Database query error in getContentByUserId");
          console.error("Error name:", error.name);
          console.error("Error message:", error.message);
          if (error.message && (error.message.includes("response is too large") || error.message.includes("507"))) {
            console.error("[STORAGE] ERROR: User has too much content! Response exceeds 64MB limit.");
            console.error("[STORAGE] Solution: Implementing lightweight retrieval (metadata only)...");
            try {
              const chunkSize = 10;
              let allContent = [];
              let offset = 0;
              let hasMore = true;
              let attempts = 0;
              const maxAttempts = 50;
              while (hasMore && allContent.length < 500 && attempts < maxAttempts) {
                attempts++;
                try {
                  const chunk = await db.select({
                    id: h5pContent.id,
                    title: h5pContent.title,
                    description: h5pContent.description,
                    type: h5pContent.type,
                    userId: h5pContent.userId,
                    isPublished: h5pContent.isPublished,
                    isPublic: h5pContent.isPublic,
                    tags: h5pContent.tags,
                    createdAt: h5pContent.createdAt,
                    updatedAt: h5pContent.updatedAt
                    // Exclude the large 'data' field for now
                  }).from(h5pContent).where(eq(h5pContent.userId, userId)).orderBy(desc(h5pContent.updatedAt)).limit(chunkSize).offset(offset);
                  if (chunk.length === 0) {
                    hasMore = false;
                  } else {
                    const chunkWithData = chunk.map((item) => ({
                      ...item,
                      data: {}
                      // Empty data for list view
                    }));
                    allContent = allContent.concat(chunkWithData);
                    offset += chunkSize;
                    if (chunk.length < chunkSize) {
                      hasMore = false;
                    }
                  }
                } catch (chunkError) {
                  console.error(`[STORAGE] Chunk ${attempts} failed:`, chunkError.message);
                  if (chunkSize > 1) {
                    console.warn(`[STORAGE] Reducing chunk size and retrying...`);
                    continue;
                  } else {
                    hasMore = false;
                  }
                }
              }
              console.log(`[STORAGE] Retrieved ${allContent.length} items (metadata only)`);
              console.warn(`[STORAGE] Note: Full content data excluded due to size. Load individual items when needed.`);
              return allContent;
            } catch (chunkError) {
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
      async getPublishedContent(id) {
        const [content] = await db.select().from(h5pContent).where(and(eq(h5pContent.id, id), eq(h5pContent.isPublished, true))).limit(1);
        return content;
      }
      async getPublicContent() {
        console.log("[DEBUG] getPublicContent called");
        const results = await db.select({
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
          creatorInstitution: profiles.institution
        }).from(h5pContent).leftJoin(profiles, eq(h5pContent.userId, profiles.id)).where(and(eq(h5pContent.isPublic, true), eq(h5pContent.isPublished, true))).orderBy(desc(h5pContent.createdAt));
        console.log(`[DEBUG] getPublicContent returned ${results.length} results`);
        return results;
      }
      async copyContent(contentId, userId) {
        const [original] = await db.select().from(h5pContent).where(and(
          eq(h5pContent.id, contentId),
          eq(h5pContent.isPublished, true),
          eq(h5pContent.isPublic, true)
        )).limit(1);
        if (!original) {
          throw new Error("Content not found or not available for copying");
        }
        const copyData = {
          userId,
          title: `Copy of ${original.title}`,
          description: original.description,
          type: original.type,
          data: original.data,
          tags: original.tags,
          isPublished: false,
          isPublic: false
        };
        const [copiedContent] = await db.insert(h5pContent).values(copyData).returning();
        return copiedContent;
      }
      async createShare(insertShare) {
        const [share] = await db.insert(contentShares).values(insertShare).returning();
        return share;
      }
      async getSharesByContentId(contentId) {
        return await db.select().from(contentShares).where(eq(contentShares.contentId, contentId));
      }
      async upsertLearnerProgress(progress) {
        const [result] = await db.insert(learnerProgress).values(progress).onConflictDoUpdate({
          target: [learnerProgress.userId, learnerProgress.contentId],
          set: {
            completionPercentage: progress.completionPercentage,
            completedAt: progress.completedAt,
            lastAccessedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return result;
      }
      async getLearnerProgress(userId, contentId) {
        const [progress] = await db.select().from(learnerProgress).where(and(
          eq(learnerProgress.userId, userId),
          eq(learnerProgress.contentId, contentId)
        )).limit(1);
        return progress;
      }
      async getUserProgressByContentId(contentId) {
        return await db.select().from(learnerProgress).where(eq(learnerProgress.contentId, contentId));
      }
      async getAllUserProgress(userId) {
        return await db.select().from(learnerProgress).where(eq(learnerProgress.userId, userId));
      }
      async createQuizAttempt(attempt) {
        const [created] = await db.insert(quizAttempts).values(attempt).returning();
        return created;
      }
      async getQuizAttempts(userId, contentId) {
        return await db.select().from(quizAttempts).where(and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.contentId, contentId)
        )).orderBy(desc(quizAttempts.completedAt));
      }
      async createInteractionEvent(event) {
        const [created] = await db.insert(interactionEvents).values(event).returning();
        return created;
      }
      async getInteractionEvents(userId, contentId) {
        return await db.select().from(interactionEvents).where(and(
          eq(interactionEvents.userId, userId),
          eq(interactionEvents.contentId, contentId)
        )).orderBy(desc(interactionEvents.createdAt));
      }
      async getContentAnalytics(contentId) {
        const content = await this.getContentById(contentId);
        if (!content) return null;
        const progressStats = await db.select({
          uniqueViewers: count(learnerProgress.userId),
          avgCompletion: avg(learnerProgress.completionPercentage),
          totalCompleted: sum(sql2`CASE WHEN ${learnerProgress.completionPercentage} >= 100 THEN 1 ELSE 0 END`)
        }).from(learnerProgress).where(eq(learnerProgress.contentId, contentId));
        const quizStats = await db.select({
          totalAttempts: count(quizAttempts.id),
          avgScore: avg(quizAttempts.score),
          avgPercentage: sql2`AVG(CAST(${quizAttempts.score} AS FLOAT) / NULLIF(${quizAttempts.totalQuestions}, 0) * 100)`
        }).from(quizAttempts).where(eq(quizAttempts.contentId, contentId));
        const interactionStats = await db.select({
          totalInteractions: count(interactionEvents.id)
        }).from(interactionEvents).where(eq(interactionEvents.contentId, contentId));
        const recentProgress = await db.select().from(learnerProgress).where(eq(learnerProgress.contentId, contentId)).orderBy(desc(learnerProgress.lastAccessedAt)).limit(10);
        return {
          content,
          stats: {
            uniqueViewers: Number(progressStats[0]?.uniqueViewers || 0),
            avgCompletion: Number(progressStats[0]?.avgCompletion || 0),
            totalCompleted: Number(progressStats[0]?.totalCompleted || 0),
            totalAttempts: Number(quizStats[0]?.totalAttempts || 0),
            avgScore: Number(quizStats[0]?.avgScore || 0),
            avgPercentage: Number(quizStats[0]?.avgPercentage || 0),
            totalInteractions: Number(interactionStats[0]?.totalInteractions || 0)
          },
          recentProgress
        };
      }
      async getUserContentAnalytics(userId) {
        const userContent = await this.getContentByUserId(userId);
        const analyticsPromises = userContent.map(async (content) => {
          const progressStats = await db.select({
            uniqueViewers: count(learnerProgress.userId),
            avgCompletion: avg(learnerProgress.completionPercentage)
          }).from(learnerProgress).where(eq(learnerProgress.contentId, content.id));
          const quizStats = await db.select({
            totalAttempts: count(quizAttempts.id),
            avgScore: avg(quizAttempts.score)
          }).from(quizAttempts).where(eq(quizAttempts.contentId, content.id));
          const interactionStats = await db.select({
            totalInteractions: count(interactionEvents.id)
          }).from(interactionEvents).where(eq(interactionEvents.contentId, content.id));
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
            totalInteractions: Number(interactionStats[0]?.totalInteractions || 0)
          };
        });
        return await Promise.all(analyticsPromises);
      }
      async getContentLearners(contentId) {
        const learners = await db.select({
          userId: learnerProgress.userId,
          fullName: profiles.fullName,
          email: profiles.email,
          role: profiles.role,
          completionPercentage: learnerProgress.completionPercentage,
          completedAt: learnerProgress.completedAt,
          lastAccessedAt: learnerProgress.lastAccessedAt,
          firstAccessedAt: learnerProgress.createdAt
        }).from(learnerProgress).innerJoin(profiles, eq(learnerProgress.userId, profiles.id)).where(eq(learnerProgress.contentId, contentId)).orderBy(desc(learnerProgress.lastAccessedAt));
        const userIds = learners.map((l) => l.userId);
        const allQuizAttempts = userIds.length > 0 ? await db.select({
          userId: quizAttempts.userId,
          score: quizAttempts.score,
          totalQuestions: quizAttempts.totalQuestions,
          completedAt: quizAttempts.completedAt
        }).from(quizAttempts).where(eq(quizAttempts.contentId, contentId)).orderBy(desc(quizAttempts.completedAt)) : [];
        const allInteractions = userIds.length > 0 ? await db.select({
          userId: interactionEvents.userId,
          totalInteractions: count(interactionEvents.id)
        }).from(interactionEvents).where(eq(interactionEvents.contentId, contentId)).groupBy(interactionEvents.userId) : [];
        const quizAttemptsByUser = allQuizAttempts.reduce((acc, attempt) => {
          if (!acc[attempt.userId]) acc[attempt.userId] = [];
          acc[attempt.userId].push(attempt);
          return acc;
        }, {});
        const interactionsByUser = allInteractions.reduce((acc, stat) => {
          acc[stat.userId] = stat.totalInteractions;
          return acc;
        }, {});
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
            quizAttempts: userAttempts.map((attempt) => ({
              score: attempt.score,
              totalQuestions: attempt.totalQuestions,
              percentage: (attempt.score / attempt.totalQuestions * 100).toFixed(1),
              completedAt: attempt.completedAt
            })),
            totalInteractions: Number(interactionsByUser[learner.userId] || 0)
          };
        });
      }
      async getQuestionAnalytics(contentId) {
        const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.contentId, contentId));
        if (attempts.length === 0) {
          return {
            totalAttempts: 0,
            questions: []
          };
        }
        const questionStats = {};
        attempts.forEach((attempt) => {
          const answers = attempt.answers;
          answers.forEach((answer) => {
            if (!questionStats[answer.questionId]) {
              questionStats[answer.questionId] = {
                questionId: answer.questionId,
                totalAttempts: 0,
                correctCount: 0,
                incorrectCount: 0,
                successRate: 0,
                difficultyScore: 0,
                commonIncorrectAnswers: {}
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
        const questions = Object.values(questionStats).map((stats) => {
          const successRate = stats.correctCount / stats.totalAttempts * 100;
          const difficultyScore = 100 - successRate;
          const topIncorrectAnswers = Object.entries(stats.commonIncorrectAnswers).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([answer, count2]) => ({ answer, count: count2 }));
          return {
            ...stats,
            successRate: Math.round(successRate * 10) / 10,
            difficultyScore: Math.round(difficultyScore * 10) / 10,
            commonIncorrectAnswers: topIncorrectAnswers
          };
        });
        return {
          totalAttempts: attempts.length,
          questions
        };
      }
      async getStudentPerformanceDistribution(contentId) {
        const attempts = await db.select({
          userId: quizAttempts.userId,
          score: quizAttempts.score,
          totalQuestions: quizAttempts.totalQuestions,
          completedAt: quizAttempts.completedAt,
          fullName: profiles.fullName,
          email: profiles.email
        }).from(quizAttempts).innerJoin(profiles, eq(quizAttempts.userId, profiles.id)).where(eq(quizAttempts.contentId, contentId)).orderBy(desc(quizAttempts.completedAt));
        if (attempts.length === 0) {
          return {
            totalStudents: 0,
            distribution: [],
            students: []
          };
        }
        const ranges = {
          "90-100%": 0,
          "80-89%": 0,
          "70-79%": 0,
          "60-69%": 0,
          "0-59%": 0
        };
        const studentBestScores = {};
        attempts.forEach((attempt) => {
          const percentage = attempt.score / attempt.totalQuestions * 100;
          if (percentage >= 90) ranges["90-100%"]++;
          else if (percentage >= 80) ranges["80-89%"]++;
          else if (percentage >= 70) ranges["70-79%"]++;
          else if (percentage >= 60) ranges["60-69%"]++;
          else ranges["0-59%"]++;
          if (!studentBestScores[attempt.userId] || percentage > studentBestScores[attempt.userId].bestPercentage) {
            studentBestScores[attempt.userId] = {
              userId: attempt.userId,
              fullName: attempt.fullName,
              email: attempt.email,
              bestScore: attempt.score,
              bestPercentage: percentage,
              totalAttempts: 1,
              latestAttempt: attempt.completedAt
            };
          } else {
            studentBestScores[attempt.userId].totalAttempts++;
            if (attempt.completedAt > studentBestScores[attempt.userId].latestAttempt) {
              studentBestScores[attempt.userId].latestAttempt = attempt.completedAt;
            }
          }
        });
        const distribution = Object.entries(ranges).map(([range, count2]) => ({
          range,
          count: count2,
          percentage: Math.round(count2 / attempts.length * 100 * 10) / 10
        }));
        const students = Object.values(studentBestScores).sort((a, b) => b.bestPercentage - a.bestPercentage).map((student) => ({
          ...student,
          bestPercentage: Math.round(student.bestPercentage * 10) / 10
        }));
        return {
          totalStudents: students.length,
          totalAttempts: attempts.length,
          distribution,
          students
        };
      }
      async getScoreDistribution(contentId) {
        const attempts = await db.select({
          score: quizAttempts.score,
          totalQuestions: quizAttempts.totalQuestions
        }).from(quizAttempts).where(eq(quizAttempts.contentId, contentId));
        if (attempts.length === 0) {
          return {
            totalAttempts: 0,
            distribution: []
          };
        }
        const buckets = {};
        attempts.forEach((attempt) => {
          const percentage = Math.round(attempt.score / attempt.totalQuestions * 100);
          const bucket = Math.floor(percentage / 10) * 10;
          const bucketKey = `${bucket}-${bucket + 9}%`;
          buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
        });
        const distribution = Object.entries(buckets).map(([range, count2]) => ({
          range,
          count: count2,
          percentage: Math.round(count2 / attempts.length * 100 * 10) / 10
        })).sort((a, b) => {
          const aStart = parseInt(a.range.split("-")[0]);
          const bStart = parseInt(b.range.split("-")[0]);
          return aStart - bStart;
        });
        return {
          totalAttempts: attempts.length,
          distribution
        };
      }
      async getAllQuizAttemptsForContent(contentId) {
        return await db.select().from(quizAttempts).where(eq(quizAttempts.contentId, contentId)).orderBy(desc(quizAttempts.completedAt));
      }
      async createChatMessage(message) {
        const [chatMessage] = await db.insert(chatMessages).values(message).returning();
        return chatMessage;
      }
      async getChatHistory(userId, limit = 50) {
        return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(desc(chatMessages.createdAt)).limit(limit);
      }
      async deleteChatHistory(userId) {
        await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
      }
      // Class methods
      async createClass(classData) {
        const [class_] = await db.insert(classes).values({
          ...classData,
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return class_;
      }
      async updateClass(id, updates) {
        const [updated] = await db.update(classes).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(classes.id, id)).returning();
        return updated;
      }
      async deleteClass(id) {
        await db.delete(classes).where(eq(classes.id, id));
      }
      async getClassById(id) {
        const [class_] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
        return class_;
      }
      async getClassesByUserId(userId) {
        return await db.select().from(classes).where(eq(classes.userId, userId)).orderBy(desc(classes.createdAt));
      }
      // Class enrollment methods
      async createClassEnrollment(enrollment) {
        const [enrollment_] = await db.insert(classEnrollments).values(enrollment).returning();
        return enrollment_;
      }
      async deleteClassEnrollment(classId, userId) {
        await db.delete(classEnrollments).where(and(eq(classEnrollments.classId, classId), eq(classEnrollments.userId, userId)));
      }
      async getClassEnrollments(classId) {
        const enrollments = await db.select({
          enrollmentId: classEnrollments.id,
          userId: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          role: profiles.role,
          enrolledAt: classEnrollments.enrolledAt
        }).from(classEnrollments).innerJoin(profiles, eq(classEnrollments.userId, profiles.id)).where(eq(classEnrollments.classId, classId)).orderBy(desc(classEnrollments.enrolledAt));
        return enrollments;
      }
      async getStudentClasses(userId) {
        const studentClasses = await db.select({
          id: classes.id,
          name: classes.name,
          description: classes.description,
          userId: classes.userId,
          subject: classes.subject,
          gradeLevel: classes.gradeLevel,
          createdAt: classes.createdAt,
          updatedAt: classes.updatedAt
        }).from(classEnrollments).innerJoin(classes, eq(classEnrollments.classId, classes.id)).where(eq(classEnrollments.userId, userId)).orderBy(desc(classes.createdAt));
        return studentClasses;
      }
      async bulkCreateEnrollments(enrollments) {
        if (enrollments.length === 0) return [];
        const results = await db.insert(classEnrollments).values(enrollments).returning();
        return results;
      }
      // Content assignment methods
      async createContentAssignment(assignment) {
        const [assignment_] = await db.insert(contentAssignments).values(assignment).returning();
        return assignment_;
      }
      async deleteContentAssignment(contentId, classId) {
        await db.delete(contentAssignments).where(and(eq(contentAssignments.contentId, contentId), eq(contentAssignments.classId, classId)));
      }
      async getContentAssignments(contentId) {
        const assignments = await db.select({
          assignmentId: contentAssignments.id,
          classId: classes.id,
          className: classes.name,
          classDescription: classes.description,
          assignedAt: contentAssignments.assignedAt,
          dueDate: contentAssignments.dueDate,
          instructions: contentAssignments.instructions
        }).from(contentAssignments).innerJoin(classes, eq(contentAssignments.classId, classes.id)).where(eq(contentAssignments.contentId, contentId)).orderBy(desc(contentAssignments.assignedAt));
        return assignments;
      }
      async getClassAssignments(classId) {
        const assignments = await db.select({
          assignmentId: contentAssignments.id,
          contentId: h5pContent.id,
          contentTitle: h5pContent.title,
          contentType: h5pContent.type,
          assignedAt: contentAssignments.assignedAt,
          dueDate: contentAssignments.dueDate,
          instructions: contentAssignments.instructions
        }).from(contentAssignments).innerJoin(h5pContent, eq(contentAssignments.contentId, h5pContent.id)).where(eq(contentAssignments.classId, classId)).orderBy(desc(contentAssignments.assignedAt));
        return assignments;
      }
      async getStudentAssignments(userId) {
        const studentClassIds = await db.select({ classId: classEnrollments.classId }).from(classEnrollments).where(eq(classEnrollments.userId, userId));
        if (studentClassIds.length === 0) return [];
        const classIds = studentClassIds.map((c) => c.classId);
        const assignments = await db.select({
          assignmentId: contentAssignments.id,
          contentId: h5pContent.id,
          contentTitle: h5pContent.title,
          contentType: h5pContent.type,
          classId: classes.id,
          className: classes.name,
          assignedAt: contentAssignments.assignedAt,
          dueDate: contentAssignments.dueDate,
          instructions: contentAssignments.instructions
        }).from(contentAssignments).innerJoin(h5pContent, eq(contentAssignments.contentId, h5pContent.id)).innerJoin(classes, eq(contentAssignments.classId, classes.id)).where(inArray(contentAssignments.classId, classIds)).orderBy(desc(contentAssignments.assignedAt));
        return assignments;
      }
      // Get recent student activity on teacher's content
      async getRecentStudentActivity(teacherId, limit = 10) {
        const teacherContent = await db.select({ id: h5pContent.id }).from(h5pContent).where(eq(h5pContent.userId, teacherId));
        if (teacherContent.length === 0) return [];
        const contentIds = teacherContent.map((c) => c.id);
        const recentActivity = await db.select({
          progressId: learnerProgress.id,
          studentId: profiles.id,
          studentName: profiles.fullName,
          contentId: h5pContent.id,
          contentTitle: h5pContent.title,
          contentType: h5pContent.type,
          completionPercentage: learnerProgress.completionPercentage,
          lastAccessedAt: learnerProgress.lastAccessedAt
        }).from(learnerProgress).innerJoin(profiles, eq(learnerProgress.userId, profiles.id)).innerJoin(h5pContent, eq(learnerProgress.contentId, h5pContent.id)).where(inArray(learnerProgress.contentId, contentIds)).orderBy(desc(learnerProgress.lastAccessedAt)).limit(limit);
        return recentActivity;
      }
    };
    storage = new DbStorage();
  }
});

// server/openai.ts
import OpenAI from "openai";
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Please configure it in your environment variables.");
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 3e4
      // 30 second timeout for all requests
    });
  }
  return openai;
}
async function generateQuizQuestions(request) {
  const numberOfOptions = request.numberOfOptions || 4;
  const optionPlaceholders = Array.from({ length: numberOfOptions }, (_, i) => `"option${i + 1}"`).join(", ");
  const prompt = `Generate ${request.numberOfItems} quiz questions about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Mix of multiple-choice (with ${numberOfOptions} options), true/false, and fill-in-the-blank questions
- Each question should have a correct answer and an explanation
- Make questions educational and engaging
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}

Respond in JSON format with an array of questions following this structure:
{
  "questions": [
    {
      "id": "unique-id",
      "type": "multiple-choice" | "true-false" | "fill-blank",
      "question": "question text",
      "options": [${optionPlaceholders}], // only for multiple-choice, exactly ${numberOfOptions} options
      "correctAnswer": 0 | "true" | "false" | "answer text",
      "explanation": "why this is the correct answer"
    }
  ]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating quiz questions. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.questions || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for quiz questions:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generateFlashcards(request) {
  const prompt = `Generate ${request.numberOfItems} flashcard pairs about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Front: term, concept, or question
- Back: definition, explanation, or answer
- Include a category for each card
- Make them educational and memorable
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}

Respond in JSON format:
{
  "cards": [
    {
      "id": "unique-id",
      "front": "term or question",
      "back": "definition or answer",
      "category": "category name"
    }
  ]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating flashcards. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.cards || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for flashcards:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generateVideoHotspots(request, videoMetadata) {
  let totalSeconds = 900;
  if (videoMetadata?.videoDuration) {
    const match = videoMetadata.videoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || "0");
      const minutes = parseInt(match[2] || "0");
      const seconds = parseInt(match[3] || "0");
      totalSeconds = hours * 3600 + minutes * 60 + seconds;
    }
  }
  const calculateTimestamps = (count2, duration) => {
    if (count2 <= 0 || duration <= 0) return [];
    const timestamps = [];
    const segments = count2;
    if (count2 === 1) {
      timestamps.push(Math.floor(duration * 0.5));
    } else if (count2 === 2) {
      timestamps.push(Math.floor(duration * 0.3));
      timestamps.push(Math.floor(duration * 0.7));
    } else if (count2 === 3) {
      timestamps.push(Math.floor(duration * 0.15));
      timestamps.push(Math.floor(duration * 0.5));
      timestamps.push(Math.floor(duration * 0.85));
    } else {
      const introEnd = Math.floor(duration * 0.15);
      const conclusionStart = Math.floor(duration * 0.85);
      const middleStart = introEnd;
      const middleEnd = conclusionStart;
      const middleRange = middleEnd - middleStart;
      timestamps.push(Math.floor(duration * 0.1));
      const middleHotspots = count2 - 2;
      for (let i = 1; i <= middleHotspots; i++) {
        const position = middleStart + middleRange * i / (middleHotspots + 1);
        timestamps.push(Math.floor(position));
      }
      timestamps.push(Math.floor(duration * 0.9));
    }
    return timestamps.sort((a, b) => a - b);
  };
  const suggestedTimestamps = calculateTimestamps(request.numberOfItems, totalSeconds);
  const timestampGuidance = suggestedTimestamps.length > 0 ? `
Suggested timestamp distribution (in seconds): ${suggestedTimestamps.join(", ")}. Use these as a guide, but adjust based on the actual video content structure.` : "";
  const description = videoMetadata?.videoDescription || "";
  const descriptionPreview = description.length > 1e3 ? description.substring(0, 1e3) + "... [truncated]" : description;
  const tagsInfo = videoMetadata?.videoTags && videoMetadata.videoTags.length > 0 ? `
- Tags: ${videoMetadata.videoTags.slice(0, 10).join(", ")}` : "";
  const channelInfo = videoMetadata?.channelTitle ? `
- Channel: ${videoMetadata.channelTitle}` : "";
  const videoInfo = videoMetadata ? `

VIDEO ANALYSIS:
- Title: ${videoMetadata.videoTitle || "Not provided"}${channelInfo}
- Duration: ${Math.floor(totalSeconds / 60)} minutes ${totalSeconds % 60} seconds
- Description: ${descriptionPreview || "Not provided"}${tagsInfo}

ANALYSIS INSTRUCTIONS:
1. Carefully read the video title and description to understand the main topics and learning objectives.
2. Identify key concepts, definitions, examples, or important points mentioned in the description.
3. Use the tags (if available) to understand the video's focus areas.
4. Create hotspots that:
   - Test understanding of main concepts mentioned in the description
   - Provide additional context or information about key topics
   - Guide learners through the video's learning progression
   - Align with the educational topic: "${request.topic}"
5. Place hotspots at logical points where concepts are likely to be introduced or explained.
6. Ensure questions are answerable based on the video content described.` : "";
  const prompt = `You are an expert educational content creator. Generate ${request.numberOfItems} high-quality interactive hotspots for an educational video.

CONTEXT:
- Topic: "${request.topic}"
- Difficulty Level: ${request.difficulty}${request.gradeLevel ? `
- Grade Level: ${request.gradeLevel}` : ""}
- Video Duration: ${Math.floor(totalSeconds / 60)} minutes ${totalSeconds % 60} seconds${timestampGuidance}
${request.additionalContext ? `
- Additional Requirements: ${request.additionalContext}` : ""}${videoInfo}

HOTSPOT REQUIREMENTS:
1. **Type Distribution**: 
   - ${Math.ceil(request.numberOfItems * 0.4)}-${Math.floor(request.numberOfItems * 0.5)} question hotspots (single question)
   - ${Math.max(1, Math.floor(request.numberOfItems * 0.2))}-${Math.ceil(request.numberOfItems * 0.3)} quiz hotspots (multiple questions - 2-4 questions each)
   - ${Math.floor(request.numberOfItems * 0.15)}-${Math.ceil(request.numberOfItems * 0.2)} information hotspots (provide context)
   - ${Math.max(0, Math.floor(request.numberOfItems * 0.1))} navigation hotspot (if applicable)

2. **Question Hotspots** (single question):
   - Must have 3-4 multiple-choice options
   - Correct answer should be clearly identifiable from the video content
   - Questions should test understanding of key concepts, not trivial details
   - Make questions age-appropriate for ${request.gradeLevel || "the specified grade level"}

3. **Quiz Hotspots** (multiple questions):
   - Each quiz hotspot should contain 2-4 related questions
   - Mix of question types: multiple-choice, true/false, and fill-in-the-blank
   - All questions in a quiz should test understanding of the same concept or related concepts
   - Questions should be progressively challenging or cover different aspects of the topic
   - Each question must have:
     - A clear question text
     - For multiple-choice: 3-4 options with one correct answer
     - For true/false: correct answer ("true" or "false")
     - For fill-blank: correct answer text
     - Optional explanation for the answer
   - Quiz title should describe the topic being tested

4. **Information Hotspots**:
   - Provide relevant context, definitions, or additional information
   - Should enhance understanding of the video content
   - Keep concise but informative

5. **Timestamp Placement**:
   - Place hotspots at natural learning moments (introduction of concepts, examples, summaries)
   - Use the suggested timestamps as a guide, but adjust based on content flow
   - Ensure all timestamps are within 0 to ${totalSeconds} seconds
   - Space hotspots appropriately to avoid clustering

6. **Content Quality**:
   - All content must be directly related to the video's topic and description
   - Questions should be answerable based on what the video likely covers
   - Use clear, age-appropriate language
   - Make content engaging and educational

Respond in JSON format:
{
  "hotspots": [
    {
      "id": "unique-id-1",
      "timestamp": 60,
      "type": "question" | "quiz" | "info" | "navigation",
      "title": "Concise, descriptive title (max 50 chars)",
      "content": "Question text or information description (optional for quiz type)",
      // For single question hotspots:
      "options": ["option1", "option2", "option3", "option4"], // only for "question" type (3-4 options)
      "correctAnswer": 0, // only for "question" type (0-based index)
      // For quiz hotspots (multiple questions):
      "questions": [ // only for "quiz" type
        {
          "id": "question-id-1",
          "type": "multiple-choice" | "true-false" | "fill-blank",
          "question": "Question text",
          "options": ["option1", "option2", "option3", "option4"], // only for multiple-choice
          "correctAnswer": 0 | "true" | "false" | "answer text", // index for multiple-choice, "true"/"false" for true-false, text for fill-blank
          "explanation": "Optional explanation for the answer"
        }
      ]
    }
  ]
}

IMPORTANT: Ensure all timestamps are valid (0 to ${totalSeconds} seconds) and hotspots are distributed throughout the video duration.`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive video content. Always respond with valid JSON. Ensure all timestamps are within the video duration." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    const hotspots = result.hotspots || [];
    return hotspots.map((hotspot) => ({
      ...hotspot,
      timestamp: Math.min(Math.max(0, hotspot.timestamp), totalSeconds)
    }));
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for video hotspots:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generateImageHotspots(request) {
  const prompt = `Generate ${request.numberOfItems} image hotspot descriptions for "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each hotspot represents a point of interest on an image
- Include x,y coordinates (as percentages 0-100) that would make sense for a typical educational diagram
- Provide title and detailed description
- Make them educational and informative
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}

Respond in JSON format:
{
  "hotspots": [
    {
      "id": "unique-id",
      "x": 25,
      "y": 30,
      "title": "hotspot title",
      "description": "detailed description"
    }
  ]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive image content. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.hotspots || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for image hotspots:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generateDragDropItems(request) {
  const prompt = `Generate a drag-and-drop activity about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Create 3-5 drop zones (categories)
- Create ${request.numberOfItems} draggable items that belong to these zones
- Each item should have a clear association with one zone
- Make it educational and intuitive
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}

Respond in JSON format:
{
  "zones": [
    {
      "id": "unique-id",
      "label": "zone label"
    }
  ],
  "items": [
    {
      "id": "unique-id",
      "content": "item text",
      "correctZone": "zone-id"
    }
  ]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive drag-and-drop activities. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return { zones: result.zones || [], items: result.items || [] };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for drag-drop items:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generateFillBlanksBlanks(request) {
  const prompt = `Generate a fill-in-the-blanks exercise about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Create a passage with ${request.numberOfItems} blanks marked as *blank*
- For each blank, provide correct answers (including acceptable variations)
- Optionally include hints
- Make it educational and clear
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}

Respond in JSON format:
{
  "text": "The capital of France is *blank*. It is known for the *blank* Tower.",
  "blanks": [
    {
      "id": "1",
      "correctAnswers": ["Paris", "paris"],
      "caseSensitive": false,
      "showHint": "Starts with P"
    }
  ]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating fill-in-the-blanks exercises. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return { text: result.text || "", blanks: result.blanks || [] };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for fill-blanks:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generateMemoryGameCards(request) {
  const prompt = `Generate ${request.numberOfItems} matching card pairs for a memory game about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each pair should have two matching items (term-definition, question-answer, etc.)
- Make the matches clear and educational
- Content should be concise to fit on cards
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}

Respond in JSON format:
{
  "cards": [
    {
      "id": "1-a",
      "content": "H2O",
      "matchId": "pair-1",
      "type": "text"
    },
    {
      "id": "1-b",
      "content": "Water",
      "matchId": "pair-1",
      "type": "text"
    }
  ]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating memory game cards. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.cards || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for memory game cards:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generateInteractiveBookPages(request) {
  const prompt = `Generate ${request.numberOfItems} pages for an interactive educational book about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each page should have a title and informative content
- Progress logically from page to page
- Make content engaging and educational
- Keep each page focused on one concept
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}

Respond in JSON format:
{
  "pages": [
    {
      "id": "unique-id",
      "title": "page title",
      "content": "page content - can be multiple paragraphs"
    }
  ]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating interactive educational books. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.pages || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response for interactive book pages:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generateVideoFinderPedagogy(params) {
  const prompt = `Generate pedagogical guidance for a video viewing activity about "${params.topic}" in ${params.subject}.

Activity Details:
- Subject: ${params.subject}
- Topic: ${params.topic}
- Learning Outcome: ${params.learningOutcome}
- Grade Level: ${params.gradeLevel}
${params.ageRange ? `- Age Range: ${params.ageRange}` : ""}
- Number of Videos: ${params.videoCount}

Generate:
1. Viewing Instructions: A paragraph (3-5 sentences) explaining:
   - The purpose of watching these videos
   - What learners should focus on while watching
   - How to actively engage with the content
   - Any preparation or follow-up activities

2. Guiding Questions: 4-6 thought-provoking questions that:
   - Help learners focus on key concepts
   - Encourage critical thinking
   - Connect to the learning outcome
   - Range from literal comprehension to deeper analysis

Make the guidance age-appropriate, clear, and actionable.

Respond in JSON format:
{
  "viewingInstructions": "clear, concise paragraph of guidance",
  "guidingQuestions": ["question 1", "question 2", "question 3", "question 4"]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert educator creating video viewing guides. Always respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
    temperature: 0.7
  }, {
    timeout: 3e4
    // 30 second timeout
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      viewingInstructions: result.viewingInstructions || "",
      guidingQuestions: result.guidingQuestions || []
    };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
async function generatePresentation(request) {
  const learningOutcomesText = request.learningOutcomes.map((o, i) => `${i + 1}. ${o}`).join("\n");
  const customInstructionsSection = request.customInstructions ? `

Additional Teacher Instructions:
${request.customInstructions}

Please carefully follow these custom instructions from the teacher when creating the presentation.` : "";
  const prompt = `Create a pedagogically sound presentation about "${request.topic}" for grade ${request.gradeLevel} students (age ${request.ageRange}).

Learning Outcomes:
${learningOutcomesText}${customInstructionsSection}

Create ${request.numberOfSlides} slides that follow best practices for educational presentations:

Slide Structure Requirements:
1. Title Slide: Engaging title and brief subtitle
2. Learning Outcomes Slide: List the learning outcomes clearly
3. Content Slides (${request.numberOfSlides - 5}): Mix of:
   - Text-heavy slides with clear headings and 3-5 bullet points
   - Image-focused slides with descriptive alt text and brief captions
   - Real-world examples and applications
4. Guiding Questions Slide: 4-6 thought-provoking questions that check understanding
5. Reflection Slide: 2-3 reflection questions for deeper thinking

Pedagogical Guidelines:
- Use age-appropriate language and examples
- Break complex concepts into digestible chunks
- Include visual variety (suggest images with descriptive alt text)
- Add speaker notes with teaching tips and explanation guidance
- Questions should range from recall to analysis to application
- Content should be culturally relevant and inclusive

IMPORTANT - Image Requirements:
- AT LEAST 30-40% of slides should include relevant educational images
- For ANY slide that would benefit from a visual (title, content, or image type), include an imageUrl
- The imageUrl should be a short, specific search query (2-4 words) to find a relevant stock photo
- Examples of good image queries: "students learning science", "mathematics geometric shapes", "rainforest ecosystem"
- Always include detailed imageAlt text for accessibility
- Images should enhance understanding and engagement

Respond in JSON format:
{
  "slides": [
    {
      "id": "unique-id",
      "type": "title" | "content" | "guiding-questions" | "reflection" | "image",
      "title": "slide title",
      "content": "main text content (optional)",
      "bulletPoints": ["point 1", "point 2"], // for content slides
      "imageUrl": "concise search query for stock photo", // INCLUDE FOR MOST SLIDES - short query like "happy students learning"
      "imageAlt": "detailed accessibility description",
      "questions": ["question 1", "question 2"], // for question slides
      "notes": "speaker notes with pedagogical guidance"
    }
  ]
}`;
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    // Use gpt-4o instead of gpt-5 (which may not exist or be slower)
    messages: [
      { role: "system", content: "You are an expert instructional designer creating educational presentations. Always respond with valid JSON and follow Universal Design for Learning (UDL) principles." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4e3,
    // Reduced from 8000 to speed up generation
    temperature: 0.7
  }, {
    timeout: 2e4
    // 20 second timeout for OpenAI API call
  });
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.slides || [];
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
var openai;
var init_openai = __esm({
  "server/openai.ts"() {
    "use strict";
    openai = null;
  }
});

// server/youtube.ts
var youtube_exports = {};
__export(youtube_exports, {
  getYouTubeClient: () => getYouTubeClient,
  searchEducationalVideos: () => searchEducationalVideos
});
import { google } from "googleapis";
function getYouTubeClient() {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API key not found. Please set YOUTUBE_API_KEY or GOOGLE_API_KEY in environment variables.");
  }
  return google.youtube({
    version: "v3",
    auth: apiKey
  });
}
async function searchEducationalVideos(params) {
  try {
    const youtube = getYouTubeClient();
    const query = `${params.subject} ${params.topic} ${params.learningOutcome} education tutorial grade ${params.gradeLevel}`;
    const searchResponse = await youtube.search.list({
      part: ["snippet"],
      q: query,
      type: ["video"],
      maxResults: params.maxResults,
      order: "relevance",
      safeSearch: "strict",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      relevanceLanguage: "en"
    });
    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return [];
    }
    const videoIds = searchResponse.data.items.map((item) => item.id?.videoId).filter((id) => !!id);
    const videosResponse = await youtube.videos.list({
      part: ["contentDetails", "snippet", "statistics"],
      id: videoIds
    });
    const results = videosResponse.data.items?.map((video) => ({
      id: video.id || "",
      videoId: video.id || "",
      title: video.snippet?.title || "",
      description: video.snippet?.description || "",
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || "",
      channelTitle: video.snippet?.channelTitle || "",
      publishedAt: video.snippet?.publishedAt || "",
      duration: video.contentDetails?.duration || "",
      tags: video.snippet?.tags || [],
      categoryId: video.snippet?.categoryId || "",
      viewCount: video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : 0,
      likeCount: video.statistics?.likeCount ? parseInt(video.statistics.likeCount) : 0
    })) || [];
    return results;
  } catch (error) {
    console.error("YouTube API error:", error);
    if (error.message && error.message.includes("GOOGLE_API_KEY")) {
      throw new Error("YouTube API key not configured. Please add GOOGLE_API_KEY to your secrets.");
    }
    if (error.message && (error.message.includes("API key") || error.message.includes("invalid") || error.message.includes("credentials"))) {
      throw new Error("Invalid YouTube API key. Please check your GOOGLE_API_KEY secret.");
    }
    throw new Error("Failed to search YouTube videos. Please try again.");
  }
}
var init_youtube = __esm({
  "server/youtube.ts"() {
    "use strict";
  }
});

// server/passport-config.ts
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt2 from "bcryptjs";
import crypto from "crypto";
var passport_config_default;
var init_passport_config = __esm({
  "server/passport-config.ts"() {
    "use strict";
    init_storage();
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Use relative path - Passport.js will automatically derive the full URL from the request
            // This ensures it works across localhost, workspace URLs, and custom domains
            callbackURL: "/api/auth/google/callback",
            // Request Slides API and Classroom API access
            scope: [
              "profile",
              "email",
              "https://www.googleapis.com/auth/presentations",
              // Google Slides API
              "https://www.googleapis.com/auth/classroom.courses.readonly",
              // List Classroom courses
              "https://www.googleapis.com/auth/classroom.coursework.students",
              // Create coursework/assignments
              "https://www.googleapis.com/auth/classroom.announcements"
              // Create announcements
            ],
            // Request offline access to get refresh token
            accessType: "offline",
            // Force consent screen to ensure refresh token is provided
            prompt: "consent"
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              const email = profile.emails?.[0]?.value;
              if (!email) {
                return done(new Error("No email found in Google profile"), void 0);
              }
              let user = await storage.getProfileByEmail(email);
              const tokenExpiry = new Date(Date.now() + 3600 * 1e3);
              if (!user) {
                const sentinelPassword = await bcrypt2.hash(crypto.randomBytes(32).toString("hex"), 10);
                user = await storage.createProfile({
                  email,
                  password: sentinelPassword,
                  fullName: profile.displayName || email,
                  role: "teacher",
                  institution: null,
                  authProvider: "google",
                  googleId: profile.id,
                  microsoftId: null,
                  googleAccessToken: accessToken,
                  googleRefreshToken: refreshToken,
                  googleTokenExpiry: tokenExpiry
                });
              } else {
                await storage.updateProfile(user.id, {
                  googleId: profile.id,
                  googleAccessToken: accessToken,
                  googleRefreshToken: refreshToken || user.googleRefreshToken,
                  // Keep existing if new one not provided
                  googleTokenExpiry: tokenExpiry
                });
                user = await storage.getProfileById(user.id);
              }
              return done(null, user);
            } catch (error) {
              return done(error, void 0);
            }
          }
        )
      );
    }
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await storage.getProfileById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
    passport_config_default = passport;
  }
});

// server/msal-config.ts
import { ConfidentialClientApplication } from "@azure/msal-node";
function getMsalClient() {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return null;
  }
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const msalConfig = {
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message, containsPii) {
          if (!containsPii) {
            console.log(message);
          }
        },
        piiLoggingEnabled: false,
        logLevel: 3
      }
    }
  };
  return new ConfidentialClientApplication(msalConfig);
}
function getRedirectUri(req) {
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/api/auth/microsoft/callback`;
}
var init_msal_config = __esm({
  "server/msal-config.ts"() {
    "use strict";
  }
});

// server/middleware/rate-limit.ts
var rate_limit_exports = {};
__export(rate_limit_exports, {
  aiGenerationRateLimit: () => aiGenerationRateLimit,
  generalApiRateLimit: () => generalApiRateLimit,
  imageSearchRateLimit: () => imageSearchRateLimit,
  presentationCreationRateLimit: () => presentationCreationRateLimit,
  rateLimit: () => rateLimit
});
function rateLimit(options) {
  const {
    maxRequests,
    windowSeconds,
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || "unknown",
    skip = () => false,
    message
  } = options;
  return (req, res, next) => {
    if (skip(req)) {
      return next();
    }
    const key = keyGenerator(req);
    const now = Date.now();
    const windowMs = windowSeconds * 1e3;
    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    const rateLimit2 = rateLimitStore[key];
    rateLimit2.count++;
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - rateLimit2.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(rateLimit2.resetTime / 1e3));
    if (rateLimit2.count > maxRequests) {
      const retryAfter = Math.ceil((rateLimit2.resetTime - now) / 1e3);
      res.setHeader("Retry-After", retryAfter);
      const errorMessage = message || `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
      return res.status(429).json({
        message: errorMessage,
        retryAfter
      });
    }
    next();
  };
}
var rateLimitStore, aiGenerationRateLimit, presentationCreationRateLimit, imageSearchRateLimit, generalApiRateLimit;
var init_rate_limit = __esm({
  "server/middleware/rate-limit.ts"() {
    "use strict";
    rateLimitStore = {};
    setInterval(() => {
      const now = Date.now();
      Object.keys(rateLimitStore).forEach((key) => {
        if (rateLimitStore[key].resetTime < now) {
          delete rateLimitStore[key];
        }
      });
    }, 10 * 60 * 1e3);
    aiGenerationRateLimit = rateLimit({
      maxRequests: 10,
      // 10 requests
      windowSeconds: 60,
      // per minute
      keyGenerator: (req) => {
        const userId = req.session?.userId;
        return userId || req.ip || req.socket.remoteAddress || "unknown";
      },
      message: "Too many AI generation requests. Please wait before generating more content."
    });
    presentationCreationRateLimit = rateLimit({
      maxRequests: 5,
      // 5 presentations
      windowSeconds: 300,
      // per 5 minutes
      keyGenerator: (req) => {
        const userId = req.session?.userId;
        return userId || req.ip || req.socket.remoteAddress || "unknown";
      },
      message: "Too many presentations created. Please wait before creating more."
    });
    imageSearchRateLimit = rateLimit({
      maxRequests: 30,
      // 30 searches
      windowSeconds: 60,
      // per minute
      keyGenerator: (req) => {
        const userId = req.session?.userId;
        return userId || req.ip || req.socket.remoteAddress || "unknown";
      },
      message: "Too many image searches. Please wait before searching again."
    });
    generalApiRateLimit = rateLimit({
      maxRequests: 100,
      // 100 requests
      windowSeconds: 60,
      // per minute
      keyGenerator: (req) => {
        const userId = req.session?.userId;
        return userId || req.ip || req.socket.remoteAddress || "unknown";
      },
      message: "Too many requests. Please slow down."
    });
  }
});

// server/email.ts
var email_exports = {};
__export(email_exports, {
  isEmailConfigured: () => isEmailConfigured,
  sendAssignmentNotificationEmail: () => sendAssignmentNotificationEmail,
  sendBulkAssignmentNotifications: () => sendBulkAssignmentNotifications,
  sendBulkWelcomeEmails: () => sendBulkWelcomeEmails,
  sendPasswordResetEmail: () => sendPasswordResetEmail,
  sendWelcomeEmail: () => sendWelcomeEmail
});
import { Resend } from "resend";
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("Email configured with Resend");
  }
  return resend;
}
function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}
function getBaseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 10px 10px;
      background: white;
    }
    .info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${APP_NAME}</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} ${APP_NAME}. All rights reserved.</p>
    <p>This email was sent automatically. Please do not reply directly to this email.</p>
  </div>
</body>
</html>
`;
}
async function sendWelcomeEmail(email, fullName, resetToken, className) {
  const client = getResendClient();
  if (!client) {
    console.log(`[EMAIL NOT CONFIGURED] Would send welcome email to ${email}`);
    console.log(`Reset link: ${APP_URL}/reset-password?token=${resetToken}`);
    return false;
  }
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
  const content = `
    <h2>Welcome to ${APP_NAME}!</h2>
    <p>Hi ${fullName},</p>
    <p>Your teacher has created an account for you${className ? ` and enrolled you in <strong>${className}</strong>` : ""}.</p>
    <p>To get started, you need to set up your password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Set Your Password</a>
    </div>
    <div class="info-box">
      <p><strong>Your login email:</strong> ${email}</p>
    </div>
    <p>This link will expire in 24 hours for security reasons.</p>
    <p>If you didn't expect this email or have any questions, please contact your teacher.</p>
  `;
  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Welcome to ${APP_NAME} - Set Your Password`,
      html: getBaseTemplate(content)
    });
    if (error) {
      console.error("Failed to send welcome email:", error);
      return false;
    }
    console.log(`Welcome email sent to ${email}`, data);
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}
async function sendPasswordResetEmail(email, fullName, resetToken) {
  const client = getResendClient();
  if (!client) {
    console.log(`[EMAIL NOT CONFIGURED] Would send password reset email to ${email}`);
    console.log(`Reset link: ${APP_URL}/reset-password?token=${resetToken}`);
    return false;
  }
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${fullName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour for security reasons.</p>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <div class="info-box">
      <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px;">${resetLink}</p>
    </div>
  `;
  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `${APP_NAME} - Password Reset Request`,
      html: getBaseTemplate(content)
    });
    if (error) {
      console.error("Failed to send password reset email:", error);
      return false;
    }
    console.log(`Password reset email sent to ${email}`, data);
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
async function sendBulkWelcomeEmails(students, className) {
  let sent = 0;
  let failed = 0;
  for (const student of students) {
    const success = await sendWelcomeEmail(
      student.email,
      student.fullName,
      student.resetToken,
      className
    );
    if (success) {
      sent++;
    } else {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return { sent, failed };
}
async function sendAssignmentNotificationEmail(email, studentName, contentTitle, contentType, className, contentId, dueDate, instructions) {
  const client = getResendClient();
  if (!client) {
    console.log(`[EMAIL NOT CONFIGURED] Would send assignment notification to ${email}`);
    return false;
  }
  const contentLink = `${APP_URL}/public/${contentId}`;
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }) : null;
  const contentTypeLabel = contentType.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  const content = `
    <h2>New Assignment Available</h2>
    <p>Hi ${studentName},</p>
    <p>Your teacher has assigned new content for you in <strong>${className}</strong>:</p>
    <div class="info-box">
      <p><strong>Title:</strong> ${contentTitle}</p>
      <p><strong>Type:</strong> ${contentTypeLabel}</p>
      ${formattedDueDate ? `<p><strong>Due Date:</strong> ${formattedDueDate}</p>` : ""}
      ${instructions ? `<p><strong>Instructions:</strong> ${instructions}</p>` : ""}
    </div>
    <div style="text-align: center;">
      <a href="${contentLink}" class="button">Start Learning</a>
    </div>
    <p>Click the button above to access your assignment and begin working on it.</p>
    <div class="info-box">
      <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px;">${contentLink}</p>
    </div>
  `;
  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `New Assignment: ${contentTitle} - ${APP_NAME}`,
      html: getBaseTemplate(content)
    });
    if (error) {
      console.error("Failed to send assignment notification email:", error);
      return false;
    }
    console.log(`Assignment notification email sent to ${email}`, data);
    return true;
  } catch (error) {
    console.error("Failed to send assignment notification email:", error);
    return false;
  }
}
async function sendBulkAssignmentNotifications(students, contentTitle, contentType, className, contentId, dueDate, instructions) {
  let sent = 0;
  let failed = 0;
  for (const student of students) {
    const success = await sendAssignmentNotificationEmail(
      student.email,
      student.fullName,
      contentTitle,
      contentType,
      className,
      contentId,
      dueDate,
      instructions
    );
    if (success) {
      sent++;
    } else {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return { sent, failed };
}
var resend, EMAIL_FROM, APP_NAME, APP_URL;
var init_email = __esm({
  "server/email.ts"() {
    "use strict";
    resend = null;
    EMAIL_FROM = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "OECS LearnBoard <notifications@oecslearning.org>";
    APP_NAME = process.env.APP_NAME || "OECS Learning Hub";
    APP_URL = process.env.APP_URL || process.env.HEROKU_APP_URL || "http://localhost:5000";
  }
});

// server/unsplash.ts
var unsplash_exports = {};
__export(unsplash_exports, {
  generateAttribution: () => generateAttribution,
  getAltText: () => getAltText,
  getRandomPhoto: () => getRandomPhoto,
  searchPhotos: () => searchPhotos,
  triggerDownload: () => triggerDownload
});
async function searchPhotos(query, perPage = 1) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("Unsplash API key not configured");
    return [];
  }
  try {
    const params = new URLSearchParams({
      query,
      per_page: perPage.toString(),
      orientation: "landscape",
      content_filter: "high"
      // PG-13 content
    });
    const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params}`, {
      headers: {
        "Authorization": `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });
    if (!response.ok) {
      console.error("Unsplash API error:", response.status, response.statusText);
      return [];
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Error fetching photos from Unsplash:", error);
    return [];
  }
}
async function getRandomPhoto(query) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("Unsplash API key not configured");
    return null;
  }
  try {
    const params = new URLSearchParams({
      query,
      orientation: "landscape",
      content_filter: "high"
    });
    const response = await fetch(`${UNSPLASH_API_URL}/photos/random?${params}`, {
      headers: {
        "Authorization": `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });
    if (!response.ok) {
      console.error("Unsplash API error:", response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching random photo from Unsplash:", error);
    return null;
  }
}
function generateAttribution(photo) {
  return `Photo by ${photo.user.name} on Unsplash`;
}
function getAltText(photo) {
  return photo.alt_description || photo.description || "Educational image";
}
async function triggerDownload(photo) {
  if (!UNSPLASH_ACCESS_KEY) {
    return;
  }
  try {
    await fetch(`${photo.links.html}/download`, {
      headers: {
        "Authorization": `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });
  } catch (error) {
    console.error("Error triggering Unsplash download event:", error);
  }
}
var UNSPLASH_API_URL, UNSPLASH_ACCESS_KEY;
var init_unsplash = __esm({
  "server/unsplash.ts"() {
    "use strict";
    UNSPLASH_API_URL = "https://api.unsplash.com";
    UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
  }
});

// server/errors/presentation-errors.ts
var presentation_errors_exports = {};
__export(presentation_errors_exports, {
  BatchSizeExceededError: () => BatchSizeExceededError,
  GoogleAuthError: () => GoogleAuthError,
  ImageInsertionError: () => ImageInsertionError,
  InvalidImageUrlError: () => InvalidImageUrlError,
  PresentationError: () => PresentationError,
  RateLimitError: () => RateLimitError,
  SlideCreationError: () => SlideCreationError,
  SpeakerNotesError: () => SpeakerNotesError,
  TokenExpiredError: () => TokenExpiredError,
  TokenRefreshError: () => TokenRefreshError,
  UntrustedImageDomainError: () => UntrustedImageDomainError
});
var PresentationError, GoogleAuthError, TokenExpiredError, TokenRefreshError, InvalidImageUrlError, UntrustedImageDomainError, BatchSizeExceededError, SlideCreationError, SpeakerNotesError, ImageInsertionError, RateLimitError;
var init_presentation_errors = __esm({
  "server/errors/presentation-errors.ts"() {
    "use strict";
    PresentationError = class _PresentationError extends Error {
      constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "PresentationError";
        Object.setPrototypeOf(this, _PresentationError.prototype);
      }
    };
    GoogleAuthError = class _GoogleAuthError extends PresentationError {
      constructor(message = "Please reconnect your Google account to continue creating presentations.") {
        super(message, "GOOGLE_AUTH_ERROR");
        this.name = "GoogleAuthError";
        Object.setPrototypeOf(this, _GoogleAuthError.prototype);
      }
    };
    TokenExpiredError = class _TokenExpiredError extends GoogleAuthError {
      constructor() {
        super("Your Google session has expired. Please reconnect your Google account.");
        this.name = "TokenExpiredError";
        Object.setPrototypeOf(this, _TokenExpiredError.prototype);
      }
    };
    TokenRefreshError = class _TokenRefreshError extends GoogleAuthError {
      constructor() {
        super("Failed to refresh your Google access token. Please reconnect your Google account.");
        this.name = "TokenRefreshError";
        Object.setPrototypeOf(this, _TokenRefreshError.prototype);
      }
    };
    InvalidImageUrlError = class _InvalidImageUrlError extends PresentationError {
      constructor(url) {
        super(
          `Invalid or inaccessible image URL: ${url}. Please ensure the image is publicly accessible.`,
          "INVALID_IMAGE_URL"
        );
        this.name = "InvalidImageUrlError";
        Object.setPrototypeOf(this, _InvalidImageUrlError.prototype);
      }
    };
    UntrustedImageDomainError = class _UntrustedImageDomainError extends PresentationError {
      constructor(url) {
        super(
          `Image URL from untrusted domain: ${url}. Only images from approved sources are allowed.`,
          "UNTRUSTED_IMAGE_DOMAIN"
        );
        this.name = "UntrustedImageDomainError";
        Object.setPrototypeOf(this, _UntrustedImageDomainError.prototype);
      }
    };
    BatchSizeExceededError = class _BatchSizeExceededError extends PresentationError {
      constructor(slideIndex, requestCount) {
        super(
          `Slide ${slideIndex} has too many elements (${requestCount} requests). Please simplify the slide.`,
          "BATCH_SIZE_EXCEEDED"
        );
        this.name = "BatchSizeExceededError";
        Object.setPrototypeOf(this, _BatchSizeExceededError.prototype);
      }
    };
    SlideCreationError = class _SlideCreationError extends PresentationError {
      constructor(slideIndex, cause) {
        super(
          `Failed to create slide ${slideIndex}: ${cause.message}`,
          "SLIDE_CREATION_ERROR"
        );
        this.name = "SlideCreationError";
        this.cause = cause;
        Object.setPrototypeOf(this, _SlideCreationError.prototype);
      }
    };
    SpeakerNotesError = class _SpeakerNotesError extends PresentationError {
      constructor(slideIndex) {
        super(
          `Failed to add speaker notes to slide ${slideIndex}. Notes may not be available.`,
          "SPEAKER_NOTES_ERROR"
        );
        this.name = "SpeakerNotesError";
        Object.setPrototypeOf(this, _SpeakerNotesError.prototype);
      }
    };
    ImageInsertionError = class _ImageInsertionError extends PresentationError {
      constructor(slideIndex, imageUrl, cause) {
        super(
          `Failed to insert image on slide ${slideIndex}: ${cause.message}. Image URL: ${imageUrl}`,
          "IMAGE_INSERTION_ERROR"
        );
        this.name = "ImageInsertionError";
        this.cause = cause;
        Object.setPrototypeOf(this, _ImageInsertionError.prototype);
      }
    };
    RateLimitError = class _RateLimitError extends PresentationError {
      constructor(retryAfter) {
        const message = retryAfter ? `Rate limit exceeded. Please try again in ${retryAfter} seconds.` : "Rate limit exceeded. Please try again later.";
        super(message, "RATE_LIMIT_ERROR");
        this.name = "RateLimitError";
        Object.setPrototypeOf(this, _RateLimitError.prototype);
      }
    };
  }
});

// server/utils/token-manager.ts
async function refreshGoogleToken(user, oauth2Client) {
  const existingLock = refreshLocks.get(user.id);
  if (existingLock) {
    await existingLock;
    const updatedUser2 = await storage.getProfileById(user.id);
    if (!updatedUser2) {
      throw new Error("User not found after token refresh");
    }
    return updatedUser2;
  }
  const refreshPromise = (async () => {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await storage.updateProfile(user.id, {
        googleAccessToken: credentials.access_token || user.googleAccessToken,
        googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : user.googleTokenExpiry
      });
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw new TokenRefreshError();
    } finally {
      refreshLocks.delete(user.id);
    }
  })();
  refreshLocks.set(user.id, refreshPromise);
  await refreshPromise;
  const updatedUser = await storage.getProfileById(user.id);
  if (!updatedUser) {
    throw new Error("User not found after token refresh");
  }
  return updatedUser;
}
function needsTokenRefresh(tokenExpiry) {
  if (!tokenExpiry) return false;
  const now = /* @__PURE__ */ new Date();
  const expiryTime = new Date(tokenExpiry);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1e3);
  return expiryTime <= fiveMinutesFromNow;
}
var refreshLocks;
var init_token_manager = __esm({
  "server/utils/token-manager.ts"() {
    "use strict";
    init_storage();
    init_presentation_errors();
    refreshLocks = /* @__PURE__ */ new Map();
  }
});

// server/constants/slides.ts
var DEFAULT_IMAGE_WIDTH_EMU, DEFAULT_IMAGE_HEIGHT_EMU, IMAGE_POSITION_X_EMU, IMAGE_POSITION_Y_EMU, TITLE_BOX_WIDTH_EMU, TITLE_BOX_HEIGHT_EMU, SUBTITLE_BOX_HEIGHT_EMU, CONTENT_BOX_WIDTH_EMU, CONTENT_BOX_HEIGHT_EMU, BULLET_BOX_HEIGHT_EMU, QUESTIONS_BOX_HEIGHT_EMU, TITLE_POSITION_X_EMU, TITLE_POSITION_Y_EMU, SUBTITLE_POSITION_Y_EMU, CONTENT_POSITION_WITH_TITLE_Y_EMU, CONTENT_POSITION_NO_TITLE_Y_EMU, FONT_SIZE_TITLE_PT, FONT_SIZE_SUBTITLE_PT, FONT_SIZE_BODY_PT, FONT_SIZE_BULLETS_PT, FONT_SIZE_QUESTIONS_PT, GOOGLE_API_BATCH_SIZE, MAX_REQUESTS_PER_SLIDE, COLOR_THEMES, TRUSTED_IMAGE_DOMAINS;
var init_slides = __esm({
  "server/constants/slides.ts"() {
    "use strict";
    DEFAULT_IMAGE_WIDTH_EMU = 4e6;
    DEFAULT_IMAGE_HEIGHT_EMU = 3e6;
    IMAGE_POSITION_X_EMU = 25e5;
    IMAGE_POSITION_Y_EMU = 15e5;
    TITLE_BOX_WIDTH_EMU = 8e6;
    TITLE_BOX_HEIGHT_EMU = 7e5;
    SUBTITLE_BOX_HEIGHT_EMU = 5e5;
    CONTENT_BOX_WIDTH_EMU = 8e6;
    CONTENT_BOX_HEIGHT_EMU = 3e6;
    BULLET_BOX_HEIGHT_EMU = 3e6;
    QUESTIONS_BOX_HEIGHT_EMU = 35e5;
    TITLE_POSITION_X_EMU = 5e5;
    TITLE_POSITION_Y_EMU = 5e5;
    SUBTITLE_POSITION_Y_EMU = 15e5;
    CONTENT_POSITION_WITH_TITLE_Y_EMU = 15e5;
    CONTENT_POSITION_NO_TITLE_Y_EMU = 8e5;
    FONT_SIZE_TITLE_PT = 36;
    FONT_SIZE_SUBTITLE_PT = 20;
    FONT_SIZE_BODY_PT = 16;
    FONT_SIZE_BULLETS_PT = 18;
    FONT_SIZE_QUESTIONS_PT = 16;
    GOOGLE_API_BATCH_SIZE = 100;
    MAX_REQUESTS_PER_SLIDE = 10;
    COLOR_THEMES = {
      blue: {
        primary: { red: 0.26, green: 0.52, blue: 0.96 },
        // #4285F4
        secondary: { red: 0.13, green: 0.33, blue: 0.63 },
        // #2155A1
        accent: { red: 0.85, green: 0.92, blue: 0.99 }
        // #D9EBFC
      },
      green: {
        primary: { red: 0.13, green: 0.59, blue: 0.53 },
        // #209787
        secondary: { red: 0.09, green: 0.39, blue: 0.35 },
        // #166359
        accent: { red: 0.84, green: 0.95, blue: 0.93 }
        // #D6F3EF
      },
      purple: {
        primary: { red: 0.61, green: 0.35, blue: 0.71 },
        // #9B59B6
        secondary: { red: 0.41, green: 0.21, blue: 0.51 },
        // #693682
        accent: { red: 0.95, green: 0.89, blue: 0.97 }
        // #F2E3F7
      },
      orange: {
        primary: { red: 0.95, green: 0.61, blue: 0.07 },
        // #F39C12
        secondary: { red: 0.76, green: 0.44, blue: 0.05 },
        // #C27810
        accent: { red: 1, green: 0.95, blue: 0.85 }
        // #FFF2D9
      },
      teal: {
        primary: { red: 0.11, green: 0.66, blue: 0.71 },
        // #1CA9B4
        secondary: { red: 0.07, green: 0.47, blue: 0.51 },
        // #127882
        accent: { red: 0.83, green: 0.96, blue: 0.97 }
        // #D4F4F7
      },
      red: {
        primary: { red: 0.91, green: 0.3, blue: 0.24 },
        // #E74C3C
        secondary: { red: 0.64, green: 0.17, blue: 0.13 },
        // #A32B21
        accent: { red: 0.99, green: 0.9, blue: 0.89 }
        // #FCE5E3
      }
    };
    TRUSTED_IMAGE_DOMAINS = [
      "images.unsplash.com",
      "unsplash.com",
      "plus.unsplash.com",
      "cdn.openai.com",
      "oaidalleapiprodscus.blob.core.windows.net",
      "puter.com",
      "api.puter.com",
      "storage.googleapis.com",
      "drive.google.com"
    ];
  }
});

// server/utils/url-validator.ts
function isUrlTrusted(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    return TRUSTED_IMAGE_DOMAINS.some((domain) => {
      const normalizedDomain = domain.toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
    });
  } catch (error) {
    return false;
  }
}
function validateImageUrl(url, allowUntrusted = false) {
  if (!url) return void 0;
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return void 0;
  let parsedUrl;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch (error) {
    throw new InvalidImageUrlError(trimmedUrl);
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new InvalidImageUrlError(trimmedUrl);
  }
  if (parsedUrl.protocol === "http:") {
    parsedUrl.protocol = "https:";
  }
  if (!allowUntrusted && !isUrlTrusted(parsedUrl.href)) {
    throw new UntrustedImageDomainError(parsedUrl.href);
  }
  return parsedUrl.href;
}
function isPublicUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/i,
      /^127\.\d+\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^0\.0\.0\.0$/,
      /^\[::/,
      /^::1$/
    ];
    return !privatePatterns.some((pattern) => pattern.test(hostname));
  } catch (error) {
    return false;
  }
}
var init_url_validator = __esm({
  "server/utils/url-validator.ts"() {
    "use strict";
    init_slides();
    init_presentation_errors();
  }
});

// server/presentation.ts
var presentation_exports = {};
__export(presentation_exports, {
  addSlidesToPresentation: () => addSlidesToPresentation,
  createPresentation: () => createPresentation
});
import { google as google2 } from "googleapis";
async function getOAuth2Client(user) {
  if (!user.googleAccessToken || !user.googleRefreshToken) {
    throw new GoogleAuthError();
  }
  const oauth2Client = new google2.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.REPLIT_DEV_DOMAIN || "http://localhost:5000"}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : void 0
  });
  let updatedUser = user;
  if (needsTokenRefresh(user.googleTokenExpiry)) {
    try {
      updatedUser = await refreshGoogleToken(user, oauth2Client);
      oauth2Client.setCredentials({
        access_token: updatedUser.googleAccessToken,
        refresh_token: updatedUser.googleRefreshToken,
        expiry_date: updatedUser.googleTokenExpiry ? new Date(updatedUser.googleTokenExpiry).getTime() : void 0
      });
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw new TokenExpiredError();
    }
  }
  return { auth: oauth2Client, user: updatedUser };
}
async function createPresentation(user, title) {
  const { auth } = await getOAuth2Client(user);
  const response = await slides.presentations.create({
    auth,
    requestBody: {
      title
    }
  });
  const presentationId = response.data.presentationId;
  const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;
  return { presentationId, url };
}
function validateSlideContent(slideContents) {
  slideContents.forEach((content, index) => {
    let requestCount = 1;
    if (content.title) requestCount += 3;
    if (content.subtitle) requestCount += 3;
    if (content.text) requestCount += 3;
    if (content.bulletPoints && content.bulletPoints.length > 0) requestCount += 3;
    if (content.questions && content.questions.length > 0) requestCount += 3;
    if (content.imageUrl) requestCount += 1;
    if (content.notes) requestCount += 1;
    if (requestCount > MAX_REQUESTS_PER_SLIDE * 2) {
      throw new BatchSizeExceededError(index, requestCount);
    }
  });
}
function validateSlideImages(slideContents, allowUntrusted = false) {
  return slideContents.map((slide, index) => {
    if (!slide.imageUrl) return slide;
    try {
      const validatedUrl = validateImageUrl(slide.imageUrl, allowUntrusted);
      if (validatedUrl && !isPublicUrl(validatedUrl)) {
        console.warn(`Slide ${index}: Image URL may not be publicly accessible: ${validatedUrl}`);
      }
      return { ...slide, imageUrl: validatedUrl };
    } catch (error) {
      console.error(`Slide ${index}: Image validation failed:`, error);
      return { ...slide, imageUrl: void 0 };
    }
  });
}
function createSlideRequests(content, index, colorTheme) {
  const slideId = `slide_${index}`;
  const requests = [];
  const theme = colorTheme ? COLOR_THEMES[colorTheme] : void 0;
  requests.push({
    createSlide: {
      objectId: slideId,
      insertionIndex: index,
      slideLayoutReference: {
        predefinedLayout: "BLANK"
      }
    }
  });
  if (content.title) {
    const titleBoxId = `title_${index}`;
    requests.push({
      createShape: {
        objectId: titleBoxId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            height: { magnitude: TITLE_BOX_HEIGHT_EMU, unit: "EMU" },
            width: { magnitude: TITLE_BOX_WIDTH_EMU, unit: "EMU" }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: TITLE_POSITION_X_EMU,
            translateY: TITLE_POSITION_Y_EMU,
            unit: "EMU"
          }
        }
      }
    });
    requests.push({
      insertText: {
        objectId: titleBoxId,
        text: content.title
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: titleBoxId,
        style: {
          fontSize: { magnitude: FONT_SIZE_TITLE_PT, unit: "PT" },
          bold: true,
          foregroundColor: theme ? { opaqueColor: { rgbColor: theme.primary } } : void 0
        },
        fields: theme ? "fontSize,bold,foregroundColor" : "fontSize,bold"
      }
    });
  }
  if (content.subtitle) {
    const subtitleBoxId = `subtitle_${index}`;
    requests.push({
      createShape: {
        objectId: subtitleBoxId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            height: { magnitude: SUBTITLE_BOX_HEIGHT_EMU, unit: "EMU" },
            width: { magnitude: TITLE_BOX_WIDTH_EMU, unit: "EMU" }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: TITLE_POSITION_X_EMU,
            translateY: SUBTITLE_POSITION_Y_EMU,
            unit: "EMU"
          }
        }
      }
    });
    requests.push({
      insertText: {
        objectId: subtitleBoxId,
        text: content.subtitle
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: subtitleBoxId,
        style: {
          fontSize: { magnitude: FONT_SIZE_SUBTITLE_PT, unit: "PT" },
          foregroundColor: theme ? { opaqueColor: { rgbColor: theme.secondary } } : void 0
        },
        fields: theme ? "fontSize,foregroundColor" : "fontSize"
      }
    });
  }
  if (content.text) {
    const textBoxId = `text_${index}`;
    const yPosition = content.title ? CONTENT_POSITION_WITH_TITLE_Y_EMU : CONTENT_POSITION_NO_TITLE_Y_EMU;
    requests.push({
      createShape: {
        objectId: textBoxId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            height: { magnitude: CONTENT_BOX_HEIGHT_EMU, unit: "EMU" },
            width: { magnitude: CONTENT_BOX_WIDTH_EMU, unit: "EMU" }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: TITLE_POSITION_X_EMU,
            translateY: yPosition,
            unit: "EMU"
          }
        }
      }
    });
    requests.push({
      insertText: {
        objectId: textBoxId,
        text: content.text
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: textBoxId,
        style: {
          fontSize: { magnitude: FONT_SIZE_BODY_PT, unit: "PT" }
        },
        fields: "fontSize"
      }
    });
  }
  if (content.bulletPoints && content.bulletPoints.length > 0) {
    const bulletBoxId = `bullets_${index}`;
    const yPosition = content.title ? CONTENT_POSITION_WITH_TITLE_Y_EMU : CONTENT_POSITION_NO_TITLE_Y_EMU;
    requests.push({
      createShape: {
        objectId: bulletBoxId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            height: { magnitude: BULLET_BOX_HEIGHT_EMU, unit: "EMU" },
            width: { magnitude: CONTENT_BOX_WIDTH_EMU, unit: "EMU" }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: TITLE_POSITION_X_EMU,
            translateY: yPosition,
            unit: "EMU"
          }
        }
      }
    });
    const bulletText = content.bulletPoints.map((point) => `\u2022 ${point}`).join("\n");
    requests.push({
      insertText: {
        objectId: bulletBoxId,
        text: bulletText
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: bulletBoxId,
        style: {
          fontSize: { magnitude: FONT_SIZE_BULLETS_PT, unit: "PT" }
        },
        fields: "fontSize"
      }
    });
  }
  if (content.questions && content.questions.length > 0) {
    const questionsBoxId = `questions_${index}`;
    const yPosition = content.title ? CONTENT_POSITION_WITH_TITLE_Y_EMU : CONTENT_POSITION_NO_TITLE_Y_EMU;
    requests.push({
      createShape: {
        objectId: questionsBoxId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            height: { magnitude: QUESTIONS_BOX_HEIGHT_EMU, unit: "EMU" },
            width: { magnitude: CONTENT_BOX_WIDTH_EMU, unit: "EMU" }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: TITLE_POSITION_X_EMU,
            translateY: yPosition,
            unit: "EMU"
          }
        }
      }
    });
    const questionsText = content.questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n");
    requests.push({
      insertText: {
        objectId: questionsBoxId,
        text: questionsText
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: questionsBoxId,
        style: {
          fontSize: { magnitude: FONT_SIZE_QUESTIONS_PT, unit: "PT" }
        },
        fields: "fontSize"
      }
    });
  }
  if (content.imageUrl) {
    try {
      requests.push({
        createImage: {
          url: content.imageUrl,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: DEFAULT_IMAGE_HEIGHT_EMU, unit: "EMU" },
              width: { magnitude: DEFAULT_IMAGE_WIDTH_EMU, unit: "EMU" }
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: IMAGE_POSITION_X_EMU,
              translateY: IMAGE_POSITION_Y_EMU,
              unit: "EMU"
            }
          }
        }
      });
    } catch (error) {
      console.error(`Failed to add image to slide ${index}:`, error);
      throw new ImageInsertionError(index, content.imageUrl, error);
    }
  }
  return requests;
}
async function addSlidesToPresentation(user, presentationId, slideContents, options = {}) {
  const { auth } = await getOAuth2Client(user);
  const warnings = [];
  const failedSlides = [];
  validateSlideContent(slideContents);
  const validatedSlides = validateSlideImages(slideContents, options.allowUntrustedImages);
  const presentation = await slides.presentations.get({
    auth,
    presentationId
  });
  const firstSlideId = presentation.data.slides?.[0]?.objectId;
  const allRequests = [];
  if (firstSlideId) {
    allRequests.push({
      deleteObject: {
        objectId: firstSlideId
      }
    });
  }
  validatedSlides.forEach((content, index) => {
    try {
      const slideRequests = createSlideRequests(content, index, options.colorTheme);
      allRequests.push(...slideRequests);
    } catch (error) {
      console.error(`Failed to create requests for slide ${index}:`, error);
      failedSlides.push(index);
      warnings.push(`Slide ${index}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });
  const batches = [];
  for (let i = 0; i < allRequests.length; i += GOOGLE_API_BATCH_SIZE) {
    const batch = allRequests.slice(i, i + GOOGLE_API_BATCH_SIZE);
    batches.push(batch);
  }
  let successCount = 0;
  for (let i = 0; i < batches.length; i++) {
    try {
      await slides.presentations.batchUpdate({
        auth,
        presentationId,
        requestBody: {
          requests: batches[i]
        }
      });
      successCount++;
    } catch (error) {
      console.error(`Batch ${i} failed:`, error);
      warnings.push(`Batch ${i} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  for (let i = 0; i < validatedSlides.length; i++) {
    const content = validatedSlides[i];
    if (content.notes) {
      try {
        await addSpeakerNotes(auth, presentationId, `slide_${i}`, content.notes);
      } catch (error) {
        console.warn(`Failed to add speaker notes to slide ${i}:`, error);
        warnings.push(`Slide ${i}: Speaker notes could not be added`);
      }
    }
  }
  return {
    successCount: validatedSlides.length - failedSlides.length,
    failedSlides,
    warnings
  };
}
async function addSpeakerNotes(auth, presentationId, slideId, notes) {
  try {
    const presentation = await slides.presentations.get({
      auth,
      presentationId
    });
    const slide = presentation.data.slides?.find((s) => s.objectId === slideId);
    if (!slide || !slide.slideProperties?.notesPage) {
      throw new Error("Notes page not found");
    }
    const notesPageId = slide.slideProperties.notesPage.objectId;
    if (!notesPageId) {
      throw new Error("Notes page ID not available");
    }
    const notesPage = slide.slideProperties.notesPage;
    const notesShape = notesPage.pageElements?.find(
      (el) => el.shape?.placeholder?.type === "BODY"
    );
    if (!notesShape || !notesShape.objectId) {
      throw new Error("Notes shape not found");
    }
    await slides.presentations.batchUpdate({
      auth,
      presentationId,
      requestBody: {
        requests: [
          {
            insertText: {
              objectId: notesShape.objectId,
              text: notes
            }
          }
        ]
      }
    });
  } catch (error) {
    console.warn("Speaker notes addition failed:", error);
    throw new SpeakerNotesError(parseInt(slideId.replace("slide_", "")));
  }
}
var slides;
var init_presentation = __esm({
  "server/presentation.ts"() {
    "use strict";
    init_token_manager();
    init_url_validator();
    init_presentation_errors();
    init_slides();
    slides = google2.slides("v1");
  }
});

// server/google-classroom.ts
var google_classroom_exports = {};
__export(google_classroom_exports, {
  listTeacherCourses: () => listTeacherCourses,
  postAnnouncement: () => postAnnouncement,
  shareToClassroom: () => shareToClassroom
});
import { google as google3 } from "googleapis";
function getOAuth2Client2(user) {
  const oauth2Client = new google3.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  if (!user.googleAccessToken) {
    throw new Error("User does not have Google access token");
  }
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });
  return oauth2Client;
}
async function listTeacherCourses(user) {
  try {
    const auth = getOAuth2Client2(user);
    const response = await classroom.courses.list({
      auth,
      teacherId: "me",
      courseStates: ["ACTIVE"],
      pageSize: 100
    });
    return response.data.courses || [];
  } catch (error) {
    console.error("Error listing courses:", error.message);
    throw new Error(`Failed to list courses: ${error.message}`);
  }
}
async function shareToClassroom(user, courseId, title, description, materialLink, dueDate, dueTime) {
  try {
    const auth = getOAuth2Client2(user);
    const coursework = {
      title,
      description,
      materials: [
        {
          link: {
            url: materialLink,
            title
          }
        }
      ],
      state: "PUBLISHED",
      workType: "ASSIGNMENT"
    };
    if (dueDate) {
      coursework.dueDate = dueDate;
      if (dueTime) {
        coursework.dueTime = dueTime;
      }
    }
    const response = await classroom.courses.courseWork.create({
      auth,
      courseId,
      requestBody: coursework
    });
    return response.data;
  } catch (error) {
    console.error("Error sharing to classroom:", error.message);
    throw new Error(`Failed to share to classroom: ${error.message}`);
  }
}
async function postAnnouncement(user, courseId, text2, materialLink, materialTitle) {
  try {
    const auth = getOAuth2Client2(user);
    const announcement = {
      text: text2,
      state: "PUBLISHED"
    };
    if (materialLink) {
      announcement.materials = [
        {
          link: {
            url: materialLink,
            title: materialTitle || "Link"
          }
        }
      ];
    }
    const response = await classroom.courses.announcements.create({
      auth,
      courseId,
      requestBody: announcement
    });
    return response.data;
  } catch (error) {
    console.error("Error posting announcement:", error.message);
    throw new Error(`Failed to post announcement: ${error.message}`);
  }
}
var classroom;
var init_google_classroom = __esm({
  "server/google-classroom.ts"() {
    "use strict";
    classroom = google3.classroom("v1");
  }
});

// server/routes.ts
var routes_exports = {};
__export(routes_exports, {
  registerRoutes: () => registerRoutes
});
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool as Pool2 } from "pg";
import crypto2 from "crypto";
import bcrypt3 from "bcryptjs";
async function registerRoutes(app2) {
  app2.set("trust proxy", 1);
  const { aiGenerationRateLimit: aiGenerationRateLimit2, presentationCreationRateLimit: presentationCreationRateLimit2, imageSearchRateLimit: imageSearchRateLimit2 } = await Promise.resolve().then(() => (init_rate_limit(), rate_limit_exports));
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  let sessionStore;
  if (process.env.DATABASE_URL) {
    const PgSession = connectPgSimple(session);
    const isSupabase = process.env.DATABASE_URL?.includes("supabase");
    const isNeon = process.env.DATABASE_URL?.includes("neon");
    let connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, "");
    const pgPool = new Pool2({
      connectionString,
      ssl: isSupabase || isNeon ? {
        rejectUnauthorized: false
      } : false,
      max: 20,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4
      // Increased timeout for Neon cold starts
    });
    pgPool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client", err);
    });
    try {
      await pgPool.query("SELECT NOW()");
      console.log("\u2713 PostgreSQL connection verified");
      sessionStore = new PgSession({
        pool: pgPool,
        createTableIfMissing: true,
        tableName: "session",
        pruneSessionInterval: 900,
        // Clean up old sessions every 15 minutes
        errorLog: (error) => {
          console.error("Session store error:", error);
        }
      });
      console.log("\u2713 Using PostgreSQL session store");
    } catch (error) {
      console.error("\u26A0 Failed to connect to PostgreSQL:", error);
      console.warn("\u26A0 Falling back to memory session store (not recommended for production)");
      sessionStore = void 0;
    }
  } else {
    console.warn("\u26A0 DATABASE_URL not set. Using memory session store.");
    console.warn("\u26A0 For production, set DATABASE_URL to use persistent session storage.");
    sessionStore = void 0;
  }
  const isGoogleOAuthAvailable = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const isMicrosoftOAuthAvailable = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  console.log("OAuth providers:", {
    google: isGoogleOAuthAvailable,
    microsoft: isMicrosoftOAuthAvailable
  });
  const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    // Trust the proxy (Vercel)
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      // Use 'lax' since frontend and backend are same-origin
      maxAge: 1e3 * 60 * 60 * 24 * 7
      // 7 days
      // Don't set domain - let it default to the request host
    }
  };
  if (sessionStore) {
    sessionConfig.store = sessionStore;
  }
  app2.use(session(sessionConfig));
  app2.use(passport_config_default.initialize());
  app2.use(passport_config_default.session());
  const requireAuth = (req, res, next) => {
    console.log("requireAuth check:", {
      hasSession: !!req.session,
      userId: req.session?.userId,
      sessionId: req.sessionID,
      cookies: req.headers.cookie
    });
    if (!req.session.userId) {
      console.log("requireAuth: No userId in session, returning 401");
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName, role, institution } = req.body;
      if (!email || !password || !fullName) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const existing = await storage.getProfileByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const profile = await storage.createProfile({
        email,
        password,
        fullName,
        role: role || "teacher",
        institution: institution || null
      });
      req.session.userId = profile.id;
      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }
      const profile = await storage.getProfileByEmail(email);
      if (!profile) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (!profile.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValid = await bcrypt3.compare(password, profile.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = profile.id;
      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getProfileById(req.session.userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });
  app2.get("/api/auth/providers", (req, res) => {
    res.json({
      google: isGoogleOAuthAvailable,
      microsoft: isMicrosoftOAuthAvailable
    });
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }
      const profile = await storage.getProfileByEmail(email.trim().toLowerCase());
      if (!profile) {
        return res.json({ message: "If an account exists with that email, a password reset link will be sent." });
      }
      const crypto3 = await import("crypto");
      const resetToken = crypto3.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
      await storage.setPasswordResetToken(email.trim().toLowerCase(), resetToken, expiresAt);
      const { sendPasswordResetEmail: sendPasswordResetEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      await sendPasswordResetEmail2(profile.email, profile.fullName, resetToken);
      res.json({ message: "If an account exists with that email, a password reset link will be sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Reset token is required" });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const profile = await storage.getProfileByResetToken(token);
      if (!profile) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      if (!profile.passwordResetExpiry || /* @__PURE__ */ new Date() > new Date(profile.passwordResetExpiry)) {
        return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
      }
      await storage.updateProfile(profile.id, { password });
      await storage.clearPasswordResetToken(profile.id);
      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  app2.get("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const token = req.query.token;
      if (!token) {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }
      const profile = await storage.getProfileByResetToken(token);
      if (!profile) {
        return res.json({ valid: false, message: "Invalid reset token" });
      }
      if (!profile.passwordResetExpiry || /* @__PURE__ */ new Date() > new Date(profile.passwordResetExpiry)) {
        return res.json({ valid: false, message: "Reset token has expired" });
      }
      res.json({ valid: true, email: profile.email });
    } catch (error) {
      console.error("Validate reset token error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });
  app2.get("/api/auth/google", (req, res, next) => {
    if (!isGoogleOAuthAvailable) {
      return res.status(503).json({
        message: "Google authentication is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      });
    }
    const returnTo = req.query.returnTo;
    if (returnTo && returnTo.startsWith("/")) {
      req.session.oauthReturnTo = returnTo;
    }
    passport_config_default.authenticate("google", {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/presentations",
        // Google Slides API
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        // List Classroom courses
        "https://www.googleapis.com/auth/classroom.coursework.students",
        // Create assignments
        "https://www.googleapis.com/auth/classroom.announcements"
        // Create announcements
      ]
    })(req, res, next);
  });
  app2.get("/api/auth/google/callback", (req, res, next) => {
    if (!isGoogleOAuthAvailable) {
      return res.redirect("/login?error=google_not_configured");
    }
    passport_config_default.authenticate("google", { failureRedirect: "/login" })(req, res, next);
  }, (req, res) => {
    req.session.userId = req.user.id;
    const returnTo = req.session.oauthReturnTo;
    delete req.session.oauthReturnTo;
    req.session.save(() => {
      if (returnTo && returnTo.startsWith("/") && !returnTo.includes("//")) {
        res.redirect(returnTo + "?googleAuthSuccess=true");
      } else {
        res.redirect("/dashboard?googleAuthSuccess=true");
      }
    });
  });
  app2.get("/api/auth/microsoft", async (req, res) => {
    if (!isMicrosoftOAuthAvailable) {
      return res.status(503).json({
        message: "Microsoft authentication is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET. MICROSOFT_TENANT_ID is optional (defaults to 'common' for multi-tenant)."
      });
    }
    const returnTo = req.query.returnTo;
    if (returnTo && returnTo.startsWith("/")) {
      req.session.oauthReturnTo = returnTo;
    }
    try {
      const msalClient = getMsalClient();
      if (!msalClient) {
        return res.status(503).json({ message: "Microsoft OAuth client not configured" });
      }
      const redirectUri = getRedirectUri(req);
      const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri
      };
      const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
      res.redirect(authUrl);
    } catch (error) {
      console.error("Microsoft OAuth initiation error:", error);
      res.status(500).json({ message: "Failed to initiate Microsoft authentication" });
    }
  });
  app2.get("/api/auth/microsoft/callback", async (req, res) => {
    console.log("Microsoft OAuth callback: Request received", {
      query: req.query,
      hasCode: !!req.query.code,
      hasError: !!req.query.error
    });
    if (!isMicrosoftOAuthAvailable) {
      console.error("Microsoft OAuth: Not configured");
      return res.redirect("/login?error=microsoft_not_configured");
    }
    if (req.query.error) {
      console.error("Microsoft OAuth: Error in callback", req.query.error, req.query.error_description);
      return res.redirect(`/login?error=${req.query.error}`);
    }
    if (!req.query.code) {
      console.error("Microsoft OAuth: No authorization code in callback");
      return res.redirect("/login?error=no_code");
    }
    try {
      const msalClient = getMsalClient();
      if (!msalClient) {
        console.error("Microsoft OAuth: MSAL client not available");
        return res.redirect("/login?error=microsoft_not_configured");
      }
      const redirectUri = getRedirectUri(req);
      console.log("Microsoft OAuth: Redirect URI:", redirectUri);
      const tokenRequest = {
        code: req.query.code,
        scopes: ["user.read"],
        redirectUri
      };
      console.log("Microsoft OAuth: Starting token acquisition...");
      const response = await msalClient.acquireTokenByCode(tokenRequest);
      if (!response || !response.account) {
        console.error("Microsoft OAuth: No account in response", response);
        return res.redirect("/login?error=microsoft_no_account");
      }
      console.log("Microsoft OAuth: Token acquired, fetching user info from Graph API...");
      const accessToken = response.accessToken;
      let email = null;
      let name = null;
      try {
        const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        if (graphResponse.ok) {
          const userInfo = await graphResponse.json();
          email = userInfo.mail || userInfo.userPrincipalName || userInfo.email;
          name = userInfo.displayName || userInfo.givenName || userInfo.name;
          console.log("Microsoft OAuth: Graph API response:", { email, name, userInfo });
        } else {
          console.error("Microsoft OAuth: Graph API error", await graphResponse.text());
        }
      } catch (graphError) {
        console.error("Microsoft OAuth: Graph API fetch error", graphError);
      }
      if (!email) {
        const account = response.account;
        email = account.username || account.localAccountId;
        name = name || account.name || account.username?.split("@")[0] || "User";
        console.log("Microsoft OAuth: Using account object fallback:", { email, name });
      }
      const microsoftId = response.account.homeAccountId;
      console.log("Microsoft OAuth callback - Final account info:", {
        email,
        name,
        microsoftId,
        accountId: response.account.localAccountId,
        tenantId: response.account.tenantId
      });
      if (!email) {
        console.error("Microsoft OAuth: No email found in account or Graph API", response.account);
        return res.redirect("/login?error=microsoft_no_email");
      }
      let user = await storage.getProfileByEmail(email);
      if (!user) {
        const sentinelPassword = await bcrypt3.hash(crypto2.randomBytes(32).toString("hex"), 10);
        user = await storage.createProfile({
          email,
          password: sentinelPassword,
          fullName: name || email,
          role: "teacher",
          institution: null,
          authProvider: "microsoft",
          googleId: null,
          microsoftId
        });
      } else if (!user.microsoftId) {
        await storage.updateProfile(user.id, {
          microsoftId
        });
      }
      console.log("Microsoft OAuth: Setting session userId:", user.id);
      console.log("Microsoft OAuth: Current session ID:", req.sessionID);
      console.log("Microsoft OAuth: Session before setting userId:", {
        userId: req.session.userId,
        cookie: req.session.cookie
      });
      req.session.userId = user.id;
      const returnTo = req.session.oauthReturnTo;
      delete req.session.oauthReturnTo;
      req.session.cookie.secure = true;
      req.session.cookie.sameSite = "lax";
      req.session.cookie.httpOnly = true;
      console.log("Microsoft OAuth: Session cookie config:", req.session.cookie);
      req.session.save((err) => {
        if (err) {
          console.error("Microsoft OAuth: Session save error:", err);
          return res.redirect("/login?error=session_failed");
        }
        console.log("Microsoft OAuth: Session saved successfully");
        console.log("Microsoft OAuth: Session ID after save:", req.sessionID);
        console.log("Microsoft OAuth: userId in session:", req.session.userId);
        console.log("Microsoft OAuth: Cookie will be sent:", res.getHeader("Set-Cookie"));
        console.log("Microsoft OAuth: Redirecting to dashboard");
        if (returnTo && returnTo.startsWith("/") && !returnTo.includes("//")) {
          res.redirect(returnTo + "?microsoftAuthSuccess=true");
        } else {
          res.redirect("/dashboard?microsoftAuthSuccess=true");
        }
      });
    } catch (error) {
      console.error("Microsoft OAuth callback error:", error);
      res.redirect("/login?error=microsoft_auth_failed");
    }
  });
  app2.get("/api/test-db", async (req, res) => {
    try {
      const userId = req.session.userId || "test-user";
      console.log("[TEST] User ID:", userId);
      console.log("[TEST] Testing database query...");
      const testResult = await storage.getContentByUserId(userId);
      console.log("[TEST] Query successful, found", testResult.length, "items");
      res.json({
        success: true,
        userId,
        count: testResult.length,
        message: "Database query works!",
        authenticated: !!req.session.userId
      });
    } catch (error) {
      console.error("[TEST] Database test failed:", error);
      console.error("[TEST] Error name:", error.name);
      console.error("[TEST] Error message:", error.message);
      console.error("[TEST] Error stack:", error.stack);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : void 0,
        name: error.name,
        code: error.code
      });
    }
  });
  const extractSubjectAndGrade = (content) => {
    try {
      const data = content.data;
      if (content.type === "video-finder" && data?.searchCriteria) {
        return {
          subject: data.searchCriteria.subject || null,
          grade: data.searchCriteria.gradeLevel || null
        };
      }
      if (content.type === "presentation" && data) {
        return {
          subject: null,
          grade: data.gradeLevel || null
        };
      }
      if (content.type === "interactive-book" && data) {
        return {
          subject: data.subject || null,
          grade: data.gradeLevel || null
        };
      }
      if (data?.metadata) {
        return {
          subject: data.metadata.subject || null,
          grade: data.metadata.gradeLevel || data.metadata.grade || null
        };
      }
      return { subject: null, grade: null };
    } catch {
      return { subject: null, grade: null };
    }
  };
  app2.get("/api/content", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID in session" });
      }
      const userProfile = await storage.getProfileById(userId);
      const userEmail = userProfile?.email || "unknown";
      console.log(`[DEBUG] Getting content for user: ${userId}`);
      console.log(`[DEBUG] User email: ${userEmail}`);
      if (userEmail === "royston.emmanuel@oecs.int") {
        console.log(`[DEBUG] Special handling for royston.emmanuel@oecs.int`);
        console.log(`[DEBUG] User ID type: ${typeof userId}, value: ${userId}`);
        console.log(`[DEBUG] User profile:`, JSON.stringify(userProfile, null, 2));
      }
      const { search, type, subject, grade, tags, startDate, endDate } = req.query;
      let contents = await storage.getContentByUserId(userId);
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        contents = contents.filter(
          (c) => c.title.toLowerCase().includes(searchLower) || c.description && c.description.toLowerCase().includes(searchLower)
        );
      }
      if (type && typeof type === "string") {
        contents = contents.filter((c) => c.type === type);
      }
      if (subject && typeof subject === "string") {
        contents = contents.filter((c) => {
          const { subject: contentSubject } = extractSubjectAndGrade(c);
          return contentSubject && contentSubject.toLowerCase() === subject.toLowerCase();
        });
      }
      if (grade && typeof grade === "string") {
        contents = contents.filter((c) => {
          const { grade: contentGrade } = extractSubjectAndGrade(c);
          return contentGrade && contentGrade.toLowerCase() === grade.toLowerCase();
        });
      }
      if (tags && typeof tags === "string") {
        const tagList = tags.split(",").map((t) => t.trim().toLowerCase());
        contents = contents.filter(
          (c) => c.tags && c.tags.some((tag) => tagList.includes(tag.toLowerCase()))
        );
      }
      if (startDate && typeof startDate === "string") {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          contents = contents.filter((c) => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated >= start;
          });
        }
      }
      if (endDate && typeof endDate === "string") {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          contents = contents.filter((c) => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated <= end;
          });
        }
      }
      res.json(contents);
    } catch (error) {
      console.error("========================================");
      console.error("Get content error:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Error stack:", error.stack);
      console.error("========================================");
      res.status(500).json({
        message: "Failed to fetch content",
        error: process.env.NODE_ENV === "development" ? error.message : void 0,
        details: process.env.NODE_ENV === "development" ? {
          name: error.name,
          code: error.code,
          message: error.message
        } : void 0
      });
    }
  });
  app2.get("/api/content/public", requireAuth, async (req, res) => {
    try {
      const { search, type, subject, grade, tags, startDate, endDate } = req.query;
      console.log(`[DEBUG] Query params:`, { search, type, subject, grade, tags, startDate, endDate });
      let contents = await storage.getPublicContent();
      console.log(`[DEBUG] Public content query returned ${contents.length} items`);
      console.log(`[DEBUG] First item:`, contents[0] ? JSON.stringify(contents[0]) : "none");
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        contents = contents.filter(
          (c) => c.title.toLowerCase().includes(searchLower) || c.description && c.description.toLowerCase().includes(searchLower)
        );
        console.log(`[DEBUG] After search filter: ${contents.length} items`);
      }
      if (type && typeof type === "string") {
        contents = contents.filter((c) => c.type === type);
        console.log(`[DEBUG] After type filter: ${contents.length} items`);
      }
      if (subject && typeof subject === "string") {
        contents = contents.filter((c) => {
          const { subject: contentSubject } = extractSubjectAndGrade(c);
          return contentSubject && contentSubject.toLowerCase() === subject.toLowerCase();
        });
        console.log(`[DEBUG] After subject filter: ${contents.length} items`);
      }
      if (grade && typeof grade === "string") {
        contents = contents.filter((c) => {
          const { grade: contentGrade } = extractSubjectAndGrade(c);
          return contentGrade && contentGrade.toLowerCase() === grade.toLowerCase();
        });
        console.log(`[DEBUG] After grade filter: ${contents.length} items`);
      }
      if (tags && typeof tags === "string") {
        const tagList = tags.split(",").map((t) => t.trim().toLowerCase());
        contents = contents.filter(
          (c) => c.tags && c.tags.some((tag) => tagList.includes(tag.toLowerCase()))
        );
        console.log(`[DEBUG] After tags filter: ${contents.length} items`);
      }
      if (startDate && typeof startDate === "string") {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          contents = contents.filter((c) => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated >= start;
          });
          console.log(`[DEBUG] After startDate filter: ${contents.length} items`);
        }
      }
      if (endDate && typeof endDate === "string") {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          contents = contents.filter((c) => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated <= end;
          });
          console.log(`[DEBUG] After endDate filter: ${contents.length} items`);
        }
      }
      console.log(`[DEBUG] Final response: ${contents.length} items`);
      console.log(`[DEBUG] Response data:`, JSON.stringify(contents));
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json(contents);
    } catch (error) {
      console.error("Get public content error:", error);
      res.status(500).json({ message: "Failed to fetch public content" });
    }
  });
  app2.get("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(content);
    } catch (error) {
      console.error("Get content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });
  app2.post("/api/content", requireAuth, async (req, res) => {
    try {
      const { title, description, type, data, isPublished, isPublic, tags, subject, gradeLevel, ageRange } = req.body;
      if (!title || !type || !data) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const content = await storage.createContent({
        title,
        description: description || null,
        type,
        data,
        userId: req.session.userId,
        isPublished: isPublished || false,
        isPublic: isPublic || false,
        tags: tags || null,
        subject: subject || null,
        gradeLevel: gradeLevel || null,
        ageRange: ageRange || null
      });
      res.json(content);
    } catch (error) {
      console.error("Create content error:", error);
      res.status(500).json({ message: "Failed to create content" });
    }
  });
  app2.put("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getContentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { title, description, data, isPublished, isPublic, tags, subject, gradeLevel, ageRange } = req.body;
      const updates = {};
      if (title !== void 0) updates.title = title;
      if (description !== void 0) updates.description = description;
      if (data !== void 0) updates.data = data;
      if (isPublished !== void 0) updates.isPublished = isPublished;
      if (isPublic !== void 0) updates.isPublic = isPublic;
      if (tags !== void 0) updates.tags = tags;
      if (subject !== void 0) updates.subject = subject;
      if (gradeLevel !== void 0) updates.gradeLevel = gradeLevel;
      if (ageRange !== void 0) updates.ageRange = ageRange;
      const updated = await storage.updateContent(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Update content error:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });
  app2.delete("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getContentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteContent(req.params.id);
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Delete content error:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });
  app2.post("/api/content/:id/share", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!content.isPublished) {
        await storage.updateContent(req.params.id, { isPublished: true });
      }
      const share = await storage.createShare({
        contentId: req.params.id,
        sharedBy: req.session.userId
      });
      res.json(share);
    } catch (error) {
      console.error("Share content error:", error);
      res.status(500).json({ message: "Failed to share content" });
    }
  });
  app2.post("/api/content/:id/copy", requireAuth, async (req, res) => {
    try {
      const copiedContent = await storage.copyContent(req.params.id, req.session.userId);
      res.json(copiedContent);
    } catch (error) {
      console.error("Copy content error:", error);
      if (error.message === "Content not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Content must be published and public to be copied") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to copy content" });
    }
  });
  app2.get("/api/preview/:id", async (req, res) => {
    try {
      const content = await storage.getPublishedContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found or not published" });
      }
      res.json(content);
    } catch (error) {
      console.error("Preview content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });
  app2.post("/api/ai/generate", requireAuth, async (req, res) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          message: "Request timeout - The AI generation is taking longer than expected. Please try again with fewer items or simpler content."
        });
      }
    }, 25e3);
    try {
      if (!process.env.OPENAI_API_KEY) {
        clearTimeout(timeout);
        return res.status(500).json({
          message: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables."
        });
      }
      const parsed = aiGenerationSchema.parse(req.body);
      let result;
      switch (parsed.contentType) {
        case "quiz":
          result = { questions: await generateQuizQuestions(parsed) };
          break;
        case "flashcard":
          result = { cards: await generateFlashcards(parsed) };
          break;
        case "interactive-video":
          result = { hotspots: await generateVideoHotspots(parsed) };
          break;
        case "image-hotspot":
          result = { hotspots: await generateImageHotspots(parsed) };
          break;
        case "drag-drop":
          result = await generateDragDropItems(parsed);
          break;
        case "fill-blanks":
          result = await generateFillBlanksBlanks(parsed);
          break;
        case "memory-game":
          result = { cards: await generateMemoryGameCards(parsed) };
          break;
        case "interactive-book":
          result = { pages: await generateInteractiveBookPages(parsed) };
          break;
        default:
          clearTimeout(timeout);
          return res.status(400).json({ message: "Invalid content type" });
      }
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.json(result);
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error("AI generation error:", error);
      if (res.headersSent) {
        return;
      }
      if (error.message?.includes("API key") || error.message?.includes("authentication")) {
        return res.status(401).json({
          message: "OpenAI API authentication failed. Please check your OPENAI_API_KEY."
        });
      }
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({
          message: "Request timeout - The AI generation took too long. Please try again with fewer items."
        });
      }
      if (error.message?.includes("rate limit")) {
        return res.status(429).json({
          message: "Rate limit exceeded. Please wait a moment and try again."
        });
      }
      res.status(500).json({
        message: error.message || "Failed to generate content. Please try again."
      });
    }
  });
  app2.post("/api/ai/generate-interactive-video", requireAuth, async (req, res) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          message: "Request timeout - The AI generation is taking longer than expected. Please try again with fewer items or simpler content."
        });
      }
    }, 25e3);
    try {
      if (!process.env.OPENAI_API_KEY) {
        clearTimeout(timeout);
        return res.status(500).json({
          message: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables."
        });
      }
      const {
        topic,
        difficulty = "intermediate",
        numberOfHotspots = 5,
        gradeLevel,
        additionalContext,
        videoId,
        videoTitle,
        videoDescription,
        videoDuration,
        videoTags,
        channelTitle
      } = req.body;
      if (!topic || !videoId) {
        clearTimeout(timeout);
        return res.status(400).json({ message: "Topic and videoId are required" });
      }
      let enhancedMetadata = {
        videoTitle,
        videoDescription,
        videoDuration,
        videoTags: videoTags || [],
        channelTitle: channelTitle || ""
      };
      if (videoId && (!videoTags || videoTags.length === 0 || !channelTitle)) {
        try {
          const { getYouTubeClient: getYouTubeClient2 } = await Promise.resolve().then(() => (init_youtube(), youtube_exports));
          const youtube = getYouTubeClient2();
          const videoResponse = await youtube.videos.list({
            part: ["snippet"],
            id: [videoId]
          });
          if (videoResponse.data.items && videoResponse.data.items.length > 0) {
            const video = videoResponse.data.items[0];
            enhancedMetadata = {
              videoTitle: video.snippet?.title || videoTitle,
              videoDescription: video.snippet?.description || videoDescription,
              videoDuration,
              videoTags: video.snippet?.tags || videoTags || [],
              channelTitle: video.snippet?.channelTitle || channelTitle || ""
            };
          }
        } catch (error) {
          console.warn("Could not fetch enhanced video metadata:", error);
        }
      }
      const request = {
        contentType: "interactive-video",
        topic,
        difficulty,
        numberOfItems: numberOfHotspots,
        gradeLevel: gradeLevel || "",
        additionalContext: additionalContext || "",
        language: "English"
      };
      const hotspots = await generateVideoHotspots(request, enhancedMetadata);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.json({
          videoUrl,
          hotspots
        });
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error("Interactive video AI generation error:", error);
      if (res.headersSent) {
        return;
      }
      if (error.message?.includes("API key") || error.message?.includes("authentication")) {
        return res.status(401).json({
          message: "OpenAI API authentication failed. Please check your OPENAI_API_KEY."
        });
      }
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({
          message: "Request timeout - The AI generation took too long. Please try again with fewer items."
        });
      }
      if (error.message?.includes("rate limit")) {
        return res.status(429).json({
          message: "Rate limit exceeded. Please wait a moment and try again."
        });
      }
      res.status(500).json({
        message: error.message || "Failed to generate interactive video. Please try again."
      });
    }
  });
  app2.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.session.userId;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }
      const user = await storage.getProfileById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const history = await storage.getChatHistory(userId, 10);
      const recentMessages = history.reverse().slice(-10);
      let systemMessage = `You are a helpful AI assistant for the OECS Content Creator platform, an educational content creation tool for teachers in the Organization of Eastern Caribbean States.

Your role is to help educators:
- Create engaging educational content (quizzes, flashcards, interactive videos, etc.)
- Get guidance on using the platform features
- Answer questions about educational best practices
- Provide support with content creation

User Information:
- Name: ${user.fullName}
- Role: ${user.role}
- Institution: ${user.institution || "Not specified"}

Platform Features:
- 8 content types: Quiz, Flashcard, Interactive Video, Image Hotspot, Drag & Drop, Fill in the Blanks, Memory Game, Interactive Book
- AI-powered content generation
- Progress tracking and analytics
- Public sharing and preview links
- Full accessibility support (WCAG 2.1 AA compliant)

Be conversational, friendly, and educational. Provide specific, actionable advice.`;
      if (context) {
        systemMessage += `

Current Context:
${JSON.stringify(context, null, 2)}`;
      }
      const messages = [
        { role: "system", content: systemMessage },
        ...recentMessages.map((msg) => ({
          role: msg.role,
          content: msg.content
        })),
        { role: "user", content: message }
      ];
      await storage.createChatMessage({
        userId,
        role: "user",
        content: message,
        context: context || null
      });
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const openai2 = getOpenAIClient();
      const stream = await openai2.chat.completions.create({
        model: "gpt-4o",
        messages,
        stream: true,
        max_completion_tokens: 2048,
        temperature: 0.7
      }, {
        timeout: 6e4
        // 60 second timeout for streaming (longer for chat)
      });
      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}

`);
        }
      }
      await storage.createChatMessage({
        userId,
        role: "assistant",
        content: fullResponse,
        context: null
      });
      res.write(`data: [DONE]

`);
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: error.message || "Failed to process chat" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}

`);
        res.end();
      }
    }
  });
  app2.get("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const limit = parseInt(req.query.limit) || 50;
      const history = await storage.getChatHistory(userId, limit);
      res.json(history.reverse());
    } catch (error) {
      console.error("Get chat history error:", error);
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });
  app2.delete("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      await storage.deleteChatHistory(userId);
      res.json({ message: "Chat history cleared" });
    } catch (error) {
      console.error("Delete chat history error:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });
  app2.post("/api/progress", requireAuth, async (req, res) => {
    try {
      const parsed = insertLearnerProgressSchema.parse({
        ...req.body,
        userId: req.session.userId,
        completedAt: req.body.completedAt ? new Date(req.body.completedAt) : req.body.completionPercentage >= 100 ? /* @__PURE__ */ new Date() : null,
        lastAccessedAt: /* @__PURE__ */ new Date()
      });
      const progress = await storage.upsertLearnerProgress(parsed);
      res.json(progress);
    } catch (error) {
      console.error("Save progress error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save progress" });
    }
  });
  app2.get("/api/progress/:contentId", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getLearnerProgress(req.session.userId, req.params.contentId);
      res.json(progress || null);
    } catch (error) {
      console.error("Get progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });
  app2.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getAllUserProgress(req.session.userId);
      res.json(progress);
    } catch (error) {
      console.error("Get all progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });
  app2.post("/api/quiz-attempts", requireAuth, async (req, res) => {
    try {
      const parsed = insertQuizAttemptSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const attempt = await storage.createQuizAttempt(parsed);
      res.json(attempt);
    } catch (error) {
      console.error("Save quiz attempt error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save quiz attempt" });
    }
  });
  app2.get("/api/quiz-attempts/:contentId", requireAuth, async (req, res) => {
    try {
      const attempts = await storage.getQuizAttempts(req.session.userId, req.params.contentId);
      res.json(attempts);
    } catch (error) {
      console.error("Get quiz attempts error:", error);
      res.status(500).json({ message: "Failed to fetch quiz attempts" });
    }
  });
  app2.post("/api/interaction-events", requireAuth, async (req, res) => {
    try {
      const parsed = insertInteractionEventSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const event = await storage.createInteractionEvent(parsed);
      res.json(event);
    } catch (error) {
      console.error("Save interaction event error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save interaction event" });
    }
  });
  app2.get("/api/interaction-events/:contentId", requireAuth, async (req, res) => {
    try {
      const events = await storage.getInteractionEvents(req.session.userId, req.params.contentId);
      res.json(events);
    } catch (error) {
      console.error("Get interaction events error:", error);
      res.status(500).json({ message: "Failed to fetch interaction events" });
    }
  });
  app2.get("/api/dashboard/recent-activity", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const activity = await storage.getRecentStudentActivity(req.session.userId, limit);
      res.json(activity);
    } catch (error) {
      console.error("Get recent activity error:", error);
      res.json([]);
    }
  });
  app2.get("/api/analytics/overview", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getUserContentAnalytics(req.session.userId);
      res.json(analytics);
    } catch (error) {
      console.error("Get analytics overview error:", error);
      console.error("Error stack:", error.stack);
      res.json([]);
    }
  });
  app2.get("/api/analytics/content/:contentId", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }
      const analytics = await storage.getContentAnalytics(req.params.contentId);
      res.json(analytics);
    } catch (error) {
      console.error("Get content analytics error:", error);
      res.status(500).json({ message: "Failed to fetch content analytics" });
    }
  });
  app2.get("/api/analytics/content/:contentId/learners", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view learner data for this content" });
      }
      const learners = await storage.getContentLearners(req.params.contentId);
      res.json(learners);
    } catch (error) {
      console.error("Get content learners error:", error);
      res.status(500).json({ message: "Failed to fetch learner data" });
    }
  });
  app2.get("/api/analytics/content/:contentId/questions", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }
      const analytics = await storage.getQuestionAnalytics(req.params.contentId);
      res.json(analytics);
    } catch (error) {
      console.error("Get question analytics error:", error);
      res.status(500).json({ message: "Failed to fetch question analytics" });
    }
  });
  app2.get("/api/analytics/content/:contentId/performance", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }
      const performance = await storage.getStudentPerformanceDistribution(req.params.contentId);
      res.json(performance);
    } catch (error) {
      console.error("Get performance distribution error:", error);
      res.status(500).json({ message: "Failed to fetch performance distribution" });
    }
  });
  app2.get("/api/analytics/content/:contentId/score-distribution", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }
      const distribution = await storage.getScoreDistribution(req.params.contentId);
      res.json(distribution);
    } catch (error) {
      console.error("Get score distribution error:", error);
      res.status(500).json({ message: "Failed to fetch score distribution" });
    }
  });
  app2.get("/api/analytics/content/:contentId/export/csv", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to export data for this content" });
      }
      const attempts = await storage.getAllQuizAttemptsForContent(req.params.contentId);
      const userIds = [...new Set(attempts.map((a) => a.userId))];
      const userProfiles = userIds.length > 0 ? await Promise.all(
        userIds.map((id) => storage.getProfileById(id))
      ) : [];
      const userMap = userProfiles.reduce((acc, profile) => {
        if (profile) acc[profile.id] = profile;
        return acc;
      }, {});
      const headers = ["Student Name", "Email", "Score", "Total Questions", "Percentage", "Completed At"];
      const rows = attempts.map((attempt) => {
        const user = userMap[attempt.userId];
        const percentage = (attempt.score / attempt.totalQuestions * 100).toFixed(1);
        return [
          user?.fullName || "Unknown",
          user?.email || "Unknown",
          attempt.score.toString(),
          attempt.totalQuestions.toString(),
          percentage,
          new Date(attempt.completedAt).toISOString()
        ];
      });
      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="quiz-results-${req.params.contentId}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Export CSV error:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });
  app2.get("/api/analytics/content/:contentId/export/json", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to export data for this content" });
      }
      const attempts = await storage.getAllQuizAttemptsForContent(req.params.contentId);
      const userIds = [...new Set(attempts.map((a) => a.userId))];
      const userProfiles = userIds.length > 0 ? await Promise.all(
        userIds.map((id) => storage.getProfileById(id))
      ) : [];
      const userMap = userProfiles.reduce((acc, profile) => {
        if (profile) acc[profile.id] = profile;
        return acc;
      }, {});
      const exportData = {
        contentId: content.id,
        contentTitle: content.title,
        exportDate: (/* @__PURE__ */ new Date()).toISOString(),
        totalAttempts: attempts.length,
        attempts: attempts.map((attempt) => {
          const user = userMap[attempt.userId];
          return {
            attemptId: attempt.id,
            studentName: user?.fullName || "Unknown",
            studentEmail: user?.email || "Unknown",
            score: attempt.score,
            totalQuestions: attempt.totalQuestions,
            percentage: Math.round(attempt.score / attempt.totalQuestions * 100 * 10) / 10,
            completedAt: attempt.completedAt,
            answers: attempt.answers
          };
        })
      };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="quiz-results-${req.params.contentId}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      console.error("Export JSON error:", error);
      res.status(500).json({ message: "Failed to export JSON" });
    }
  });
  app2.post("/api/classes", requireAuth, async (req, res) => {
    try {
      const { name, description, subject, gradeLevel } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Class name is required" });
      }
      const class_ = await storage.createClass({
        name: name.trim(),
        description: description?.trim() || null,
        subject: subject?.trim() || null,
        gradeLevel: gradeLevel?.trim() || null,
        userId: req.session.userId
      });
      res.json(class_);
    } catch (error) {
      console.error("Create class error:", error);
      res.status(500).json({ message: "Failed to create class" });
    }
  });
  app2.get("/api/classes", requireAuth, async (req, res) => {
    try {
      const classes2 = await storage.getClassesByUserId(req.session.userId);
      res.json(classes2);
    } catch (error) {
      console.error("Get classes error:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });
  app2.get("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view this class" });
      }
      res.json(class_);
    } catch (error) {
      console.error("Get class error:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });
  app2.put("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to update this class" });
      }
      const { name, description, subject, gradeLevel } = req.body;
      const updates = {};
      if (name !== void 0) updates.name = name.trim();
      if (description !== void 0) updates.description = description?.trim() || null;
      if (subject !== void 0) updates.subject = subject?.trim() || null;
      if (gradeLevel !== void 0) updates.gradeLevel = gradeLevel?.trim() || null;
      const updated = await storage.updateClass(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Update class error:", error);
      res.status(500).json({ message: "Failed to update class" });
    }
  });
  app2.delete("/api/classes/:id", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to delete this class" });
      }
      await storage.deleteClass(req.params.id);
      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      console.error("Delete class error:", error);
      res.status(500).json({ message: "Failed to delete class" });
    }
  });
  app2.get("/api/classes/:id/enrollments", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view enrollments" });
      }
      const enrollments = await storage.getClassEnrollments(req.params.id);
      res.json(enrollments);
    } catch (error) {
      console.error("Get enrollments error:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });
  app2.post("/api/classes/:id/enrollments", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to manage enrollments" });
      }
      const { userId } = req.body;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ message: "User ID is required" });
      }
      const enrollment = await storage.createClassEnrollment({
        classId: req.params.id,
        userId
      });
      res.json(enrollment);
    } catch (error) {
      console.error("Create enrollment error:", error);
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "User is already enrolled in this class" });
      }
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });
  app2.delete("/api/classes/:id/enrollments/:userId", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to manage enrollments" });
      }
      await storage.deleteClassEnrollment(req.params.id, req.params.userId);
      res.json({ message: "Enrollment removed successfully" });
    } catch (error) {
      console.error("Delete enrollment error:", error);
      res.status(500).json({ message: "Failed to remove enrollment" });
    }
  });
  app2.post("/api/classes/:id/students", requireAuth, async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
        return res.status(400).json({ message: "First name, last name, and email are required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to manage this class" });
      }
      let user = await storage.getProfileByEmail(email.trim().toLowerCase());
      let isNewUser = false;
      if (user) {
        if (user.role === "teacher" || user.role === "admin") {
          return res.status(400).json({
            message: "This email belongs to a teacher account. Teachers cannot be enrolled as students."
          });
        }
        const enrollments = await storage.getClassEnrollments(req.params.id);
        const alreadyEnrolled = enrollments.some((e) => e.userId === user.id);
        if (alreadyEnrolled) {
          return res.status(409).json({ message: "This student is already enrolled in the class" });
        }
      } else {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        user = await storage.createProfile({
          email: email.trim().toLowerCase(),
          fullName,
          password: null,
          // User will need to set password via password reset
          role: "student",
          authProvider: "email"
        });
        isNewUser = true;
      }
      await storage.createClassEnrollment({
        classId: req.params.id,
        userId: user.id
      });
      let emailSent = false;
      if (isNewUser) {
        try {
          const crypto3 = await import("crypto");
          const resetToken = crypto3.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
          await storage.setPasswordResetToken(user.email, resetToken, expiresAt);
          const { sendWelcomeEmail: sendWelcomeEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
          emailSent = await sendWelcomeEmail2(user.email, user.fullName, resetToken, class_.name);
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }
      }
      res.json({
        message: isNewUser ? emailSent ? "Student created and enrolled. Welcome email sent." : "Student created and enrolled. Email could not be sent - student should use 'Forgot Password' to set their password." : "Student enrolled successfully",
        student: {
          id: user.id,
          email: user.email,
          fullName: user.fullName
        },
        emailSent
      });
    } catch (error) {
      console.error("Create student error:", error);
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      res.status(500).json({ message: error.message || "Failed to create student" });
    }
  });
  app2.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getProfileById(req.session.userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  app2.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const { fullName, institution } = req.body;
      if (fullName && typeof fullName === "string" && !fullName.trim()) {
        return res.status(400).json({ message: "Full name cannot be empty" });
      }
      const updates = {};
      if (fullName) updates.fullName = fullName.trim();
      if (institution !== void 0) updates.institution = institution?.trim() || null;
      updates.updatedAt = /* @__PURE__ */ new Date();
      const updated = await storage.updateProfile(req.session.userId, updates);
      if (!updated) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app2.put("/api/profile/password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }
      const profile = await storage.getProfileById(req.session.userId);
      if (!profile || !profile.password) {
        return res.status(400).json({ message: "Password change not available for OAuth accounts" });
      }
      const isValid = await bcrypt3.compare(currentPassword, profile.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const hashedPassword = await bcrypt3.hash(newPassword, 10);
      const updated = await storage.updateProfile(req.session.userId, {
        password: hashedPassword
      });
      if (!updated) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
  app2.get("/api/users/search", requireAuth, async (req, res) => {
    try {
      const { email, q } = req.query;
      if (!email && !q) {
        return res.status(400).json({ message: "Email or search query is required" });
      }
      const searchTerm = email || q;
      const user = await storage.getProfileByEmail(searchTerm);
      if (user) {
        return res.json([{
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          institution: user.institution
        }]);
      }
      res.json([]);
    } catch (error) {
      console.error("User search error:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });
  app2.get("/api/student/classes", requireAuth, async (req, res) => {
    try {
      const studentClasses = await storage.getStudentClasses(req.session.userId);
      res.json(studentClasses);
    } catch (error) {
      console.error("Get student classes error:", error);
      res.status(500).json({ message: "Failed to fetch student classes" });
    }
  });
  app2.post("/api/content/:contentId/assignments", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to assign this content" });
      }
      const { classId, dueDate, instructions } = req.body;
      if (!classId || typeof classId !== "string") {
        return res.status(400).json({ message: "Class ID is required" });
      }
      const class_ = await storage.getClassById(classId);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to assign to this class" });
      }
      const assignment = await storage.createContentAssignment({
        contentId: req.params.contentId,
        classId,
        dueDate: dueDate ? new Date(dueDate) : null,
        instructions: instructions?.trim() || null
      });
      (async () => {
        try {
          console.log(`[EMAIL] Starting notification process for class: ${classId}`);
          const enrollments = await storage.getClassEnrollments(classId);
          console.log(`[EMAIL] Found ${enrollments.length} enrollments in class`);
          console.log(`[EMAIL] Enrollments:`, enrollments.map((e) => ({ email: e.email, role: e.role })));
          const students = enrollments.filter((e) => e.role === "student").map((e) => ({ email: e.email, fullName: e.fullName }));
          console.log(`[EMAIL] Found ${students.length} students to notify`);
          if (students.length > 0) {
            const { sendBulkAssignmentNotifications: sendBulkAssignmentNotifications2 } = await Promise.resolve().then(() => (init_email(), email_exports));
            const result = await sendBulkAssignmentNotifications2(
              students,
              content.title,
              content.type,
              class_.name,
              req.params.contentId,
              dueDate ? new Date(dueDate) : null,
              instructions?.trim() || null
            );
            console.log(`[EMAIL] Assignment notifications sent: ${result.sent} success, ${result.failed} failed`);
          } else {
            console.log(`[EMAIL] No students to notify in this class`);
          }
        } catch (emailError) {
          console.error("[EMAIL] Failed to send assignment notification emails:", emailError);
        }
      })();
      res.json(assignment);
    } catch (error) {
      console.error("Create assignment error:", error);
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "Content is already assigned to this class" });
      }
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });
  app2.get("/api/content/:contentId/assignments", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view assignments" });
      }
      const assignments = await storage.getContentAssignments(req.params.contentId);
      res.json(assignments);
    } catch (error) {
      console.error("Get assignments error:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });
  app2.delete("/api/content/:contentId/assignments/:classId", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.contentId);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to manage assignments" });
      }
      await storage.deleteContentAssignment(req.params.contentId, req.params.classId);
      res.json({ message: "Assignment removed successfully" });
    } catch (error) {
      console.error("Delete assignment error:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });
  app2.get("/api/classes/:id/assignments", requireAuth, async (req, res) => {
    try {
      const class_ = await storage.getClassById(req.params.id);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (class_.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to view assignments" });
      }
      const assignments = await storage.getClassAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      console.error("Get class assignments error:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });
  app2.get("/api/student/assignments", requireAuth, async (req, res) => {
    try {
      const assignments = await storage.getStudentAssignments(req.session.userId);
      res.json(assignments);
    } catch (error) {
      console.error("Get student assignments error:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });
  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
  app2.post("/api/classes/bulk-upload", requireAuth, async (req, res) => {
    try {
      const { csvData, classId } = req.body;
      if (!csvData || typeof csvData !== "string") {
        return res.status(400).json({ message: "CSV data is required" });
      }
      const lines = csvData.trim().split("\n");
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV must have at least a header row and one data row" });
      }
      const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const emailIndex = headers.findIndex((h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address" || h.startsWith("student_email"));
      const firstNameIndex = headers.findIndex((h) => h === "firstname" || h === "first name" || h === "first_name");
      const lastNameIndex = headers.findIndex((h) => h === "lastname" || h === "last name" || h === "last_name");
      const nameIndex = headers.findIndex((h) => h === "name" || h === "full name" || h === "fullname");
      const enrollments = [];
      const errors = [];
      const targetClassId = classId;
      if (targetClassId && emailIndex === -1) {
        return res.status(400).json({
          message: "CSV must have an 'email' column when enrolling in an existing class. Expected format: email (or student_email)"
        });
      }
      if (targetClassId) {
        const class_ = await storage.getClassById(targetClassId);
        if (!class_) {
          return res.status(404).json({ message: "Class not found" });
        }
        if (class_.userId !== req.session.userId) {
          return res.status(403).json({ message: "Not authorized to manage this class" });
        }
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]).map((v) => v.trim().replace(/^"|"$/g, ""));
          const email = values[emailIndex];
          if (!email) {
            errors.push(`Row ${i + 1}: Missing email`);
            continue;
          }
          let user = await storage.getProfileByEmail(email);
          if (!user) {
            let fullName;
            const firstName = firstNameIndex !== -1 ? values[firstNameIndex]?.trim() : "";
            const lastName = lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : "";
            if (firstName || lastName) {
              fullName = `${firstName} ${lastName}`.trim();
            } else if (nameIndex !== -1 && values[nameIndex]) {
              fullName = values[nameIndex];
            } else {
              fullName = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
            }
            try {
              user = await storage.createProfile({
                email,
                fullName,
                password: null,
                // User will need to set password via password reset
                role: "student",
                authProvider: "email"
              });
            } catch (e) {
              errors.push(`Row ${i + 1}: Failed to create user for email ${email}: ${e.message}`);
              continue;
            }
          }
          enrollments.push({
            classId: targetClassId,
            userId: user.id
          });
        }
        if (enrollments.length > 0) {
          await storage.bulkCreateEnrollments(enrollments);
        }
      } else {
        const classHeaders = ["class_name", "name", "class name"];
        const classNameIndex = headers.findIndex((h) => classHeaders.includes(h));
        if (classNameIndex === -1) {
          return res.status(400).json({ message: "CSV must have a 'class_name' or 'name' column for creating classes" });
        }
        const classValues = parseCSVLine(lines[1]).map((v) => v.trim().replace(/^"|"$/g, ""));
        const className = classValues[classNameIndex];
        if (!className) {
          return res.status(400).json({ message: "Missing class name in the first data row" });
        }
        const descIndex = headers.findIndex((h) => h === "description" || h === "desc");
        const subjectIndex = headers.findIndex((h) => h === "subject");
        const gradeLevelIndex = headers.findIndex((h) => h === "grade_level" || h === "grade level" || h === "gradelevel");
        const class_ = await storage.createClass({
          name: className,
          description: descIndex !== -1 ? classValues[descIndex] : null,
          subject: subjectIndex !== -1 ? classValues[subjectIndex] : null,
          gradeLevel: gradeLevelIndex !== -1 ? classValues[gradeLevelIndex] : null,
          userId: req.session.userId
        });
        let studentStartIndex = -1;
        let studentHeaders = [];
        let studentEmailIndex = -1;
        let studentFirstNameIndex = -1;
        let studentLastNameIndex = -1;
        let studentNameIndex = -1;
        for (let i = 2; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const potentialHeaders = parseCSVLine(line).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
          const hasEmailHeader = potentialHeaders.some(
            (h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address"
          );
          const hasNameHeader = potentialHeaders.some(
            (h) => h === "firstname" || h === "first name" || h === "first_name" || h === "lastname" || h === "last name" || h === "last_name" || h === "name" || h === "full name" || h === "fullname"
          );
          if (hasEmailHeader && hasNameHeader) {
            studentHeaders = potentialHeaders;
            studentStartIndex = i + 1;
            studentEmailIndex = potentialHeaders.findIndex(
              (h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address"
            );
            studentFirstNameIndex = potentialHeaders.findIndex(
              (h) => h === "firstname" || h === "first name" || h === "first_name"
            );
            studentLastNameIndex = potentialHeaders.findIndex(
              (h) => h === "lastname" || h === "last name" || h === "last_name"
            );
            studentNameIndex = potentialHeaders.findIndex(
              (h) => h === "name" || h === "full name" || h === "fullname"
            );
            break;
          }
        }
        let enrolledCount = 0;
        if (studentStartIndex > 0) {
          for (let i = studentStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = parseCSVLine(line).map((v) => v.trim().replace(/^"|"$/g, ""));
            const email = studentEmailIndex !== -1 ? values[studentEmailIndex] : null;
            if (!email || !email.includes("@")) {
              errors.push(`Row ${i + 1}: Missing or invalid email`);
              continue;
            }
            let user = await storage.getProfileByEmail(email);
            if (!user) {
              let fullName;
              const firstName = studentFirstNameIndex !== -1 ? values[studentFirstNameIndex]?.trim() : "";
              const lastName = studentLastNameIndex !== -1 ? values[studentLastNameIndex]?.trim() : "";
              if (firstName || lastName) {
                fullName = `${firstName} ${lastName}`.trim();
              } else if (studentNameIndex !== -1 && values[studentNameIndex]) {
                fullName = values[studentNameIndex];
              } else {
                fullName = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
              }
              try {
                user = await storage.createProfile({
                  email,
                  fullName,
                  password: null,
                  role: "student",
                  authProvider: "email"
                });
              } catch (e) {
                errors.push(`Row ${i + 1}: Failed to create user for ${email}: ${e.message}`);
                continue;
              }
            }
            try {
              await storage.createClassEnrollment({
                classId: class_.id,
                userId: user.id
              });
              enrolledCount++;
            } catch (e) {
              if (!e.message?.includes("unique") && !e.message?.includes("duplicate")) {
                errors.push(`Row ${i + 1}: Failed to enroll ${email}`);
              } else {
                enrolledCount++;
              }
            }
          }
        }
        return res.json({
          message: `Successfully created class "${className}" with ${enrolledCount} student(s)`,
          classes: [class_],
          errors: errors.length > 0 ? errors : void 0
        });
      }
      res.json({
        message: `Successfully enrolled ${enrollments.length} student(s)`,
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ message: error.message || "Failed to process bulk upload" });
    }
  });
  app2.post("/api/youtube/search-simple", requireAuth, async (req, res) => {
    try {
      const { query, maxResults = 10 } = req.body;
      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ message: "Search query is required" });
      }
      if (maxResults < 1 || maxResults > 50) {
        return res.status(400).json({ message: "Max results must be between 1 and 50" });
      }
      const { searchEducationalVideos: searchEducationalVideos2 } = await Promise.resolve().then(() => (init_youtube(), youtube_exports));
      const results = await searchEducationalVideos2({
        subject: "",
        topic: query.trim(),
        learningOutcome: "",
        gradeLevel: "",
        ageRange: "",
        maxResults
      });
      res.json({ results, searchDate: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      console.error("YouTube search error:", error);
      res.status(500).json({
        message: error.message || "Failed to search YouTube videos. Please try again."
      });
    }
  });
  app2.post("/api/youtube/search", requireAuth, async (req, res) => {
    try {
      const { subject, topic, learningOutcome, gradeLevel, ageRange, videoCount } = req.body;
      if (!subject || !topic || !learningOutcome || !gradeLevel || !videoCount) {
        return res.status(400).json({ message: "Missing required search criteria" });
      }
      if (videoCount < 1 || videoCount > 50) {
        return res.status(400).json({ message: "Video count must be between 1 and 50" });
      }
      const results = await searchEducationalVideos({
        subject,
        topic,
        learningOutcome,
        gradeLevel,
        ageRange: ageRange || "",
        maxResults: videoCount
      });
      res.json({ results, searchDate: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      console.error("YouTube search error:", error);
      res.status(500).json({
        message: error.message || "Failed to search YouTube videos. Please try again."
      });
    }
  });
  app2.post("/api/video-finder/generate-pedagogy", requireAuth, async (req, res) => {
    try {
      const parsed = videoFinderPedagogySchema.parse(req.body);
      const result = await generateVideoFinderPedagogy(parsed);
      res.json(result);
    } catch (error) {
      console.error("Video Finder pedagogy generation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({
        message: error.message || "Failed to generate pedagogical content. Please try again."
      });
    }
  });
  app2.post("/api/presentation/generate", requireAuth, aiGenerationRateLimit2, async (req, res) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          message: "Request timeout - The AI generation is taking longer than expected. Please try again with fewer slides or simpler content."
        });
      }
    }, 25e3);
    try {
      const parsed = presentationGenerationSchema.parse(req.body);
      console.log("Presentation generation started:", {
        topic: parsed.topic,
        numberOfSlides: parsed.numberOfSlides,
        gradeLevel: parsed.gradeLevel
      });
      const slides2 = await generatePresentation(parsed);
      clearTimeout(timeout);
      if (!res.headersSent) {
        console.log("Presentation generation completed:", slides2.length, "slides");
        res.json({ slides: slides2, generatedDate: (/* @__PURE__ */ new Date()).toISOString() });
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error("Presentation generation error:", error);
      if (res.headersSent) {
        return;
      }
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({
          message: "Request timeout - The AI generation took too long. Please try again with fewer slides."
        });
      }
      res.status(500).json({
        message: error.message || "Failed to generate slides content. Please try again."
      });
    }
  });
  app2.post("/api/unsplash/search", requireAuth, imageSearchRateLimit2, async (req, res) => {
    try {
      const { query, count: count2 = 1 } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }
      const { searchPhotos: searchPhotos2 } = await Promise.resolve().then(() => (init_unsplash(), unsplash_exports));
      const photos = await searchPhotos2(query, count2);
      res.json({ photos });
    } catch (error) {
      console.error("Unsplash search error:", error);
      res.status(500).json({
        message: error.message || "Failed to search for images"
      });
    }
  });
  app2.post("/api/ai/generate-image", requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "Prompt is required" });
      }
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({
          message: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables to use AI image generation."
        });
      }
      let openai2;
      try {
        openai2 = getOpenAIClient();
      } catch (configError) {
        return res.status(400).json({
          message: configError.message || "OpenAI configuration error. Please check your API key."
        });
      }
      const response = await openai2.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      });
      if (!response.data || response.data.length === 0) {
        throw new Error("No image data returned from OpenAI");
      }
      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL returned from OpenAI");
      }
      res.json({
        imageUrl,
        prompt,
        revisedPrompt: response.data[0]?.revised_prompt
      });
    } catch (error) {
      console.error("OpenAI image generation error:", error);
      res.status(500).json({
        message: error.message || "Failed to generate image with AI. Please try again."
      });
    }
  });
  app2.post("/api/presentation/create-presentation", requireAuth, presentationCreationRateLimit2, async (req, res) => {
    try {
      const { title, slides: slides2, colorTheme } = req.body;
      if (!title || !slides2 || !Array.isArray(slides2)) {
        return res.status(400).json({ message: "Missing required fields: title and slides" });
      }
      const user = await storage.getProfileById(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.googleAccessToken || !user.googleRefreshToken) {
        return res.status(403).json({
          message: "Please sign in with Google to create presentations in Google Slides. Your current account doesn't have Google Slides access."
        });
      }
      const { createPresentation: createPresentation2, addSlidesToPresentation: addSlidesToPresentation2 } = await Promise.resolve().then(() => (init_presentation(), presentation_exports));
      const { searchPhotos: searchPhotos2, getAltText: getAltText2, generateAttribution: generateAttribution2 } = await Promise.resolve().then(() => (init_unsplash(), unsplash_exports));
      const { GoogleAuthError: GoogleAuthError2, TokenExpiredError: TokenExpiredError2 } = await Promise.resolve().then(() => (init_presentation_errors(), presentation_errors_exports));
      const slidesWithImages = await Promise.all(slides2.map(async (slide) => {
        if (slide.imageUrl && typeof slide.imageUrl === "string" && !slide.imageUrl.startsWith("http")) {
          try {
            const photos = await searchPhotos2(slide.imageUrl, 1);
            if (photos.length > 0) {
              const photo = photos[0];
              return {
                ...slide,
                imageUrl: photo.urls.regular,
                imageAlt: slide.imageAlt || getAltText2(photo),
                imageAttribution: generateAttribution2(photo)
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch image for query "${slide.imageUrl}":`, error);
          }
        }
        return slide;
      }));
      const { presentationId, url } = await createPresentation2(user, title);
      const result = await addSlidesToPresentation2(user, presentationId, slidesWithImages, {
        colorTheme: colorTheme || "blue",
        allowUntrustedImages: false
        // Only allow trusted image domains
      });
      res.json({
        presentationId,
        url,
        message: "Presentation created successfully in Google Slides!",
        successCount: result.successCount,
        warnings: result.warnings.length > 0 ? result.warnings : void 0,
        failedSlides: result.failedSlides.length > 0 ? result.failedSlides : void 0
      });
    } catch (error) {
      console.error("Create presentation error:", error);
      if (error.name === "GoogleAuthError" || error.name === "TokenExpiredError") {
        return res.status(403).json({
          message: error.message || "Please reconnect your Google account to create presentations."
        });
      }
      if (error.name === "BatchSizeExceededError") {
        return res.status(400).json({
          message: error.message
        });
      }
      if (error.message?.includes("not connected their Google account")) {
        return res.status(403).json({
          message: "Please sign in with Google to create presentations. Go to Settings and connect your Google account."
        });
      }
      res.status(500).json({
        message: error.message || "Failed to create presentation. Please try again."
      });
    }
  });
  app2.get("/api/google-classroom/courses", requireAuth, async (req, res) => {
    try {
      const user = await storage.getProfileById(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.googleAccessToken) {
        return res.status(403).json({
          message: "Please sign in with Google to access Google Classroom. Your current account doesn't have Google access."
        });
      }
      const { listTeacherCourses: listTeacherCourses2 } = await Promise.resolve().then(() => (init_google_classroom(), google_classroom_exports));
      const courses = await listTeacherCourses2(user);
      res.json({ courses });
    } catch (error) {
      console.error("List Google Classroom courses error:", error);
      res.status(500).json({
        message: error.message || "Failed to list Google Classroom courses"
      });
    }
  });
  app2.post("/api/google-classroom/share", requireAuth, async (req, res) => {
    try {
      const { courseId, title, description, materialLink, dueDate, dueTime } = req.body;
      if (!courseId || !title || !materialLink) {
        return res.status(400).json({
          message: "Missing required fields: courseId, title, materialLink"
        });
      }
      const user = await storage.getProfileById(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.googleAccessToken) {
        return res.status(403).json({
          message: "Please sign in with Google to share to Google Classroom"
        });
      }
      const { shareToClassroom: shareToClassroom2 } = await Promise.resolve().then(() => (init_google_classroom(), google_classroom_exports));
      const coursework = await shareToClassroom2(
        user,
        courseId,
        title,
        description || "",
        materialLink,
        dueDate,
        dueTime
      );
      res.json({
        coursework,
        message: "Successfully shared to Google Classroom!"
      });
    } catch (error) {
      console.error("Share to Google Classroom error:", error);
      res.status(500).json({
        message: error.message || "Failed to share to Google Classroom"
      });
    }
  });
  app2.post("/api/google-classroom/announce", requireAuth, async (req, res) => {
    try {
      const { courseId, text: text2, materialLink, materialTitle } = req.body;
      if (!courseId || !text2) {
        return res.status(400).json({
          message: "Missing required fields: courseId, text"
        });
      }
      const user = await storage.getProfileById(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.googleAccessToken) {
        return res.status(403).json({
          message: "Please sign in with Google to post to Google Classroom"
        });
      }
      const { postAnnouncement: postAnnouncement2 } = await Promise.resolve().then(() => (init_google_classroom(), google_classroom_exports));
      const announcement = await postAnnouncement2(
        user,
        courseId,
        text2,
        materialLink,
        materialTitle
      );
      res.json({
        announcement,
        message: "Successfully posted announcement to Google Classroom!"
      });
    } catch (error) {
      console.error("Post announcement to Google Classroom error:", error);
      res.status(500).json({
        message: error.message || "Failed to post announcement to Google Classroom"
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
var init_routes = __esm({
  "server/routes.ts"() {
    "use strict";
    init_storage();
    init_schema();
    init_openai();
    init_youtube();
    init_passport_config();
    init_msal_config();
  }
});

// api/index.ts
import express from "express";
var app = null;
var initError = null;
var initPromise = null;
async function initializeApp() {
  if (app) return;
  if (initError) throw initError;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      console.log("[Init] Starting Express app initialization...");
      app = express();
      app.set("trust proxy", 1);
      app.use(express.json({ limit: "50mb" }));
      app.use(express.urlencoded({ extended: false, limit: "50mb" }));
      console.log("[Init] Importing routes...");
      const { registerRoutes: registerRoutes2 } = await Promise.resolve().then(() => (init_routes(), routes_exports));
      await registerRoutes2(app);
      console.log("[Init] Routes registered");
      app.use((err, _req, res, _next) => {
        console.error("[Error]", err);
        res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
      });
      console.log("[Init] App initialization complete");
    } catch (error) {
      console.error("[Init] Failed:", error.message);
      console.error("[Init] Stack:", error.stack);
      initError = error;
      throw error;
    }
  })();
  return initPromise;
}
async function handler(req, res) {
  try {
    await initializeApp();
    return app(req, res);
  } catch (error) {
    return res.status(500).json({
      message: "Server initialization failed",
      error: error.message
    });
  }
}
export {
  handler as default
};
