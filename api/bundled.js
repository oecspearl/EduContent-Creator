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

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
function removeClient(client) {
  const idx = clients.indexOf(client);
  if (idx !== -1) clients.splice(idx, 1);
}
function safeSend(ws, payload) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  } catch (e) {
    console.error("WebSocket send failed:", e);
  }
}
function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId") || "";
    const role = url.searchParams.get("role") || "teacher";
    if (!userId) {
      ws.close(1008, "userId required");
      return;
    }
    const client = { ws, userId, role };
    clients.push(client);
    ws.on("close", () => removeClient(client));
    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${userId}:`, error.message);
      removeClient(client);
    });
  });
  return wss;
}
function notifyUser(userId, event, data) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  clients.filter((c) => c.userId === userId).forEach((c) => safeSend(c.ws, payload));
}
function notifyTeachers(event, data) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  clients.filter((c) => c.role === "teacher").forEach((c) => safeSend(c.ws, payload));
}
var clients;
var init_websocket = __esm({
  "server/websocket.ts"() {
    "use strict";
    clients = [];
  }
});

// shared/schemas/tables.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, timestamp, integer, real, unique, index } from "drizzle-orm/pg-core";
var profiles, h5pContent, contentShares, learnerProgress, quizAttempts, interactionEvents, chatMessages, classes, classEnrollments, auditLog, notifications, learningPaths, learningPathItems, studentGroups, studentGroupMembers, messages, rubrics, rubricScores, studentAssignments, contentAssignments;
var init_tables = __esm({
  "shared/schemas/tables.ts"() {
    "use strict";
    profiles = pgTable("profiles", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password"),
      fullName: text("full_name").notNull(),
      role: text("role").notNull().default("teacher"),
      institution: text("institution"),
      authProvider: text("auth_provider").default("email"),
      googleId: text("google_id"),
      microsoftId: text("microsoft_id"),
      googleAccessToken: text("google_access_token"),
      googleRefreshToken: text("google_refresh_token"),
      googleTokenExpiry: timestamp("google_token_expiry"),
      passwordResetToken: text("password_reset_token"),
      passwordResetExpiry: timestamp("password_reset_expiry"),
      parentShareToken: text("parent_share_token"),
      // Token for parent/guardian read-only access
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    h5pContent = pgTable("h5p_content", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: text("title").notNull(),
      description: text("description"),
      type: text("type").notNull(),
      data: jsonb("data").notNull(),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      isPublished: boolean("is_published").default(false).notNull(),
      isPublic: boolean("is_public").default(false).notNull(),
      tags: text("tags").array(),
      subject: text("subject"),
      gradeLevel: text("grade_level"),
      ageRange: text("age_range"),
      curriculumContext: jsonb("curriculum_context"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("h5p_content_user_id_idx").on(table.userId),
      isPublicIdx: index("h5p_content_is_public_idx").on(table.isPublic)
    }));
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
      totalQuestions: integer("total_questions").notNull(),
      answers: jsonb("answers").notNull(),
      completedAt: timestamp("completed_at").defaultNow().notNull()
    }, (table) => ({
      userContentIdx: index("quiz_attempts_user_content_idx").on(table.userId, table.contentId),
      contentIdIdx: index("quiz_attempts_content_id_idx").on(table.contentId)
    }));
    interactionEvents = pgTable("interaction_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      eventType: text("event_type").notNull(),
      eventData: jsonb("event_data"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      userContentIdx: index("interaction_events_user_content_idx").on(table.userId, table.contentId)
    }));
    chatMessages = pgTable("chat_messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      role: text("role").notNull(),
      content: text("content").notNull(),
      context: jsonb("context"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    classes = pgTable("classes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      description: text("description"),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      subject: text("subject"),
      gradeLevel: text("grade_level"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    classEnrollments = pgTable("class_enrollments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      enrolledAt: timestamp("enrolled_at").defaultNow().notNull()
    }, (table) => ({
      uniqueClassUser: unique().on(table.classId, table.userId),
      userIdIdx: index("class_enrollments_user_id_idx").on(table.userId)
    }));
    auditLog = pgTable("audit_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => profiles.id, { onDelete: "set null" }),
      action: text("action").notNull(),
      // 'quiz_completed', 'content_assigned', 'grade_exported', etc.
      entityType: text("entity_type").notNull(),
      // 'content', 'class', 'assignment', etc.
      entityId: varchar("entity_id"),
      metadata: jsonb("metadata"),
      // Additional context
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      type: text("type").notNull(),
      // 'new_assignment', 'due_reminder', 'grade_posted', 'message'
      title: text("title").notNull(),
      body: text("body"),
      linkUrl: text("link_url"),
      // In-app link to navigate to
      isRead: boolean("is_read").default(false).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("notifications_user_id_idx").on(table.userId)
    }));
    learningPaths = pgTable("learning_paths", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      description: text("description"),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      classId: varchar("class_id").references(() => classes.id, { onDelete: "set null" }),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    learningPathItems = pgTable("learning_path_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      pathId: varchar("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      orderIndex: integer("order_index").notNull(),
      isRequired: boolean("is_required").default(true).notNull()
    });
    studentGroups = pgTable("student_groups", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      description: text("description"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    studentGroupMembers = pgTable("student_group_members", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      groupId: varchar("group_id").notNull().references(() => studentGroups.id, { onDelete: "cascade" }),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" })
    }, (table) => ({
      uniqueGroupUser: unique().on(table.groupId, table.userId)
    }));
    messages = pgTable("messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      fromUserId: varchar("from_user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      toUserId: varchar("to_user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      subject: text("subject"),
      body: text("body").notNull(),
      contentId: varchar("content_id").references(() => h5pContent.id, { onDelete: "set null" }),
      // Optional reference to content
      isRead: boolean("is_read").default(false).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    rubrics = pgTable("rubrics", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      criteria: jsonb("criteria").notNull(),
      // Array of { name, description, levels: [{ label, points, description }] }
      maxScore: integer("max_score").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    rubricScores = pgTable("rubric_scores", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      rubricId: varchar("rubric_id").notNull().references(() => rubrics.id, { onDelete: "cascade" }),
      studentId: varchar("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      scores: jsonb("scores").notNull(),
      // { [criterionName]: { level, points } }
      totalScore: integer("total_score").notNull(),
      feedback: text("feedback"),
      scoredAt: timestamp("scored_at").defaultNow().notNull()
    }, (table) => ({
      uniqueRubricStudent: unique().on(table.rubricId, table.studentId)
    }));
    studentAssignments = pgTable("student_assignments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      studentId: varchar("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      assignedBy: varchar("assigned_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
      assignedAt: timestamp("assigned_at").defaultNow().notNull(),
      dueDate: timestamp("due_date"),
      instructions: text("instructions")
    }, (table) => ({
      uniqueContentStudent: unique().on(table.contentId, table.studentId),
      studentIdIdx: index("student_assignments_student_id_idx").on(table.studentId),
      contentIdIdx: index("student_assignments_content_id_idx").on(table.contentId)
    }));
    contentAssignments = pgTable("content_assignments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
      classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
      assignedAt: timestamp("assigned_at").defaultNow().notNull(),
      dueDate: timestamp("due_date"),
      scheduledAt: timestamp("scheduled_at"),
      // Future publish date — null means immediate
      instructions: text("instructions")
    }, (table) => ({
      uniqueContentClass: unique().on(table.contentId, table.classId),
      classIdIdx: index("content_assignments_class_id_idx").on(table.classId)
    }));
  }
});

// shared/schemas/api-schemas.ts
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
var insertProfileSchema, insertH5pContentSchema, insertContentShareSchema, insertLearnerProgressSchema, insertQuizAttemptSchema, insertInteractionEventSchema, insertChatMessageSchema, insertClassSchema, insertClassEnrollmentSchema, insertContentAssignmentSchema, curriculumContextSchema, presentationGenerationSchema, aiGenerationSchema, videoFinderPedagogySchema, interactiveVideoGenerationSchema, chatRequestSchema, unsplashSearchSchema, youtubeSimpleSearchSchema, youtubeFullSearchSchema, aiImageGenerationSchema;
var init_api_schemas = __esm({
  "shared/schemas/api-schemas.ts"() {
    "use strict";
    init_tables();
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
    curriculumContextSchema = z.object({
      subject: z.string(),
      grade: z.string(),
      strand: z.string(),
      eloText: z.string(),
      scoTexts: z.array(z.string()).optional()
    });
    presentationGenerationSchema = z.object({
      topic: z.string().min(1),
      gradeLevel: z.string().min(1),
      ageRange: z.string().min(1),
      learningOutcomes: z.array(z.string()).min(1).max(10),
      numberOfSlides: z.number().min(5).max(30).default(10),
      customInstructions: z.string().optional(),
      curriculumContext: curriculumContextSchema.optional()
    });
    aiGenerationSchema = z.object({
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
      curriculumContext: curriculumContextSchema.optional()
    });
    videoFinderPedagogySchema = z.object({
      subject: z.string().min(1),
      topic: z.string().min(1),
      learningOutcome: z.string().min(1),
      gradeLevel: z.string().min(1),
      ageRange: z.string().optional(),
      videoCount: z.number().min(1).max(50)
    });
    interactiveVideoGenerationSchema = z.object({
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
      channelTitle: z.string().optional()
    });
    chatRequestSchema = z.object({
      message: z.string().min(1),
      context: z.record(z.any()).optional().nullable()
    });
    unsplashSearchSchema = z.object({
      query: z.string().min(1),
      count: z.number().min(1).max(30).default(1)
    });
    youtubeSimpleSearchSchema = z.object({
      query: z.string().min(1),
      maxResults: z.number().min(1).max(50).default(10)
    });
    youtubeFullSearchSchema = z.object({
      subject: z.string().min(1),
      topic: z.string().min(1),
      learningOutcome: z.string().min(1),
      gradeLevel: z.string().min(1),
      ageRange: z.string().optional(),
      videoCount: z.number().min(1).max(50)
    });
    aiImageGenerationSchema = z.object({
      prompt: z.string().min(1).max(2e3)
    });
  }
});

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiGenerationSchema: () => aiGenerationSchema,
  aiImageGenerationSchema: () => aiImageGenerationSchema,
  auditLog: () => auditLog,
  chatMessages: () => chatMessages,
  chatRequestSchema: () => chatRequestSchema,
  classEnrollments: () => classEnrollments,
  classes: () => classes,
  contentAssignments: () => contentAssignments,
  contentShares: () => contentShares,
  curriculumContextSchema: () => curriculumContextSchema,
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
  interactiveVideoGenerationSchema: () => interactiveVideoGenerationSchema,
  learnerProgress: () => learnerProgress,
  learningPathItems: () => learningPathItems,
  learningPaths: () => learningPaths,
  messages: () => messages,
  notifications: () => notifications,
  presentationGenerationSchema: () => presentationGenerationSchema,
  profiles: () => profiles,
  quizAttempts: () => quizAttempts,
  rubricScores: () => rubricScores,
  rubrics: () => rubrics,
  studentAssignments: () => studentAssignments,
  studentGroupMembers: () => studentGroupMembers,
  studentGroups: () => studentGroups,
  unsplashSearchSchema: () => unsplashSearchSchema,
  videoFinderPedagogySchema: () => videoFinderPedagogySchema,
  youtubeFullSearchSchema: () => youtubeFullSearchSchema,
  youtubeSimpleSearchSchema: () => youtubeSimpleSearchSchema
});
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    init_tables();
    init_api_schemas();
  }
});

// db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
var isVercel, pool, dbInstance, db;
var init_db = __esm({
  "db/index.ts"() {
    "use strict";
    init_schema();
    isVercel = !!process.env.VERCEL;
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
        max: isVercel ? 1 : 20,
        idleTimeoutMillis: isVercel ? 5e3 : 3e4,
        connectionTimeoutMillis: 1e4
      });
      pool.on("error", (err) => {
        console.error("Unexpected error on idle PostgreSQL client", err);
      });
      dbInstance = drizzle(pool, { schema: schema_exports });
      console.log(`\u2713 Database pool created (max: ${isVercel ? 5 : 20})`);
      if (isSupabase) console.log("\u2713 Using Supabase PostgreSQL");
      else if (isNeon) console.log("\u2713 Using Neon PostgreSQL");
      else console.log("\u2713 Using PostgreSQL");
    } else {
      console.warn("\u26A0 DATABASE_URL is not set. Database operations will not work.");
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

// server/repositories/profile-repository.ts
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
var ProfileRepository;
var init_profile_repository = __esm({
  "server/repositories/profile-repository.ts"() {
    "use strict";
    init_db();
    init_schema();
    ProfileRepository = class {
      async create(insertProfile) {
        const password = insertProfile.password ? insertProfile.password.startsWith("$2") ? insertProfile.password : await bcrypt.hash(insertProfile.password, 10) : null;
        const [profile] = await db.insert(profiles).values({ ...insertProfile, password }).returning();
        return profile;
      }
      async update(id, updates) {
        if (updates.password && typeof updates.password === "string" && !updates.password.startsWith("$2")) {
          updates.password = await bcrypt.hash(updates.password, 10);
        }
        const updateData = { ...updates };
        updateData.updatedAt = /* @__PURE__ */ new Date();
        const [profile] = await db.update(profiles).set(updateData).where(eq(profiles.id, id)).returning();
        return profile;
      }
      async getById(id) {
        const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
        return profile;
      }
      async getByEmail(email) {
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
      async getByResetToken(token) {
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
    };
  }
});

// server/repositories/content-repository.ts
import { eq as eq2, and, desc } from "drizzle-orm";
var ContentRepository;
var init_content_repository = __esm({
  "server/repositories/content-repository.ts"() {
    "use strict";
    init_db();
    init_schema();
    ContentRepository = class {
      async create(insertContent) {
        const [content] = await db.insert(h5pContent).values(insertContent).returning();
        return content;
      }
      async update(id, updates) {
        const [content] = await db.update(h5pContent).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(h5pContent.id, id)).returning();
        return content;
      }
      async delete(id) {
        await db.delete(h5pContent).where(eq2(h5pContent.id, id));
      }
      async getById(id) {
        const [content] = await db.select().from(h5pContent).where(eq2(h5pContent.id, id)).limit(1);
        return content;
      }
      async getByUserId(userId, limit) {
        const queryLimit = limit || 50;
        try {
          return await db.select().from(h5pContent).where(eq2(h5pContent.userId, userId)).orderBy(desc(h5pContent.updatedAt)).limit(queryLimit);
        } catch (error) {
          const isOversized = error.message?.includes("response is too large") || error.message?.includes("507");
          if (!isOversized) throw error;
          console.warn(`[STORAGE] Response too large for user ${userId}. Falling back to metadata-only query.`);
          try {
            const metadata = await db.select({
              id: h5pContent.id,
              title: h5pContent.title,
              description: h5pContent.description,
              type: h5pContent.type,
              userId: h5pContent.userId,
              isPublished: h5pContent.isPublished,
              isPublic: h5pContent.isPublic,
              tags: h5pContent.tags,
              subject: h5pContent.subject,
              gradeLevel: h5pContent.gradeLevel,
              ageRange: h5pContent.ageRange,
              createdAt: h5pContent.createdAt,
              updatedAt: h5pContent.updatedAt
            }).from(h5pContent).where(eq2(h5pContent.userId, userId)).orderBy(desc(h5pContent.updatedAt)).limit(queryLimit);
            return metadata.map((item) => ({ ...item, data: {} }));
          } catch {
            console.error("[STORAGE] Metadata-only query also failed. Returning empty array.");
            return [];
          }
        }
      }
      async getPublished(id) {
        const [content] = await db.select().from(h5pContent).where(and(eq2(h5pContent.id, id), eq2(h5pContent.isPublished, true))).limit(1);
        return content;
      }
      async getPublic() {
        return await db.select({
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
        }).from(h5pContent).leftJoin(profiles, eq2(h5pContent.userId, profiles.id)).where(and(eq2(h5pContent.isPublic, true), eq2(h5pContent.isPublished, true))).orderBy(desc(h5pContent.createdAt));
      }
      async copy(contentId, userId) {
        const [original] = await db.select().from(h5pContent).where(and(
          eq2(h5pContent.id, contentId),
          eq2(h5pContent.isPublished, true),
          eq2(h5pContent.isPublic, true)
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
        return await db.select().from(contentShares).where(eq2(contentShares.contentId, contentId));
      }
    };
  }
});

// server/repositories/analytics-repository.ts
import { eq as eq3, and as and2, desc as desc2, count, avg, sum, sql as sql2, inArray } from "drizzle-orm";
var AnalyticsRepository;
var init_analytics_repository = __esm({
  "server/repositories/analytics-repository.ts"() {
    "use strict";
    init_db();
    init_schema();
    AnalyticsRepository = class {
      // ─── Progress ─────────────────────────────────────────────
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
        const [progress] = await db.select().from(learnerProgress).where(and2(eq3(learnerProgress.userId, userId), eq3(learnerProgress.contentId, contentId))).limit(1);
        return progress;
      }
      async getUserProgressByContentId(contentId) {
        return await db.select().from(learnerProgress).where(eq3(learnerProgress.contentId, contentId));
      }
      async getAllUserProgress(userId) {
        return await db.select().from(learnerProgress).where(eq3(learnerProgress.userId, userId));
      }
      // ─── Quiz attempts ───────────────────────────────────────
      async createQuizAttempt(attempt) {
        const [created] = await db.insert(quizAttempts).values(attempt).returning();
        return created;
      }
      async getQuizAttempts(userId, contentId) {
        return await db.select().from(quizAttempts).where(and2(eq3(quizAttempts.userId, userId), eq3(quizAttempts.contentId, contentId))).orderBy(desc2(quizAttempts.completedAt));
      }
      async getAllQuizAttemptsForContent(contentId) {
        return await db.select().from(quizAttempts).where(eq3(quizAttempts.contentId, contentId)).orderBy(desc2(quizAttempts.completedAt));
      }
      // ─── Interaction events ──────────────────────────────────
      async createInteractionEvent(event) {
        const [created] = await db.insert(interactionEvents).values(event).returning();
        return created;
      }
      async getInteractionEvents(userId, contentId) {
        return await db.select().from(interactionEvents).where(and2(eq3(interactionEvents.userId, userId), eq3(interactionEvents.contentId, contentId))).orderBy(desc2(interactionEvents.createdAt));
      }
      // ─── Aggregated analytics ────────────────────────────────
      async getContentAnalytics(contentId, content) {
        if (!content) return null;
        const [progressStats, quizStats, interactionStats, recentProgress] = await Promise.all([
          db.select({
            uniqueViewers: count(learnerProgress.userId),
            avgCompletion: avg(learnerProgress.completionPercentage),
            totalCompleted: sum(sql2`CASE WHEN ${learnerProgress.completionPercentage} >= 100 THEN 1 ELSE 0 END`)
          }).from(learnerProgress).where(eq3(learnerProgress.contentId, contentId)),
          db.select({
            totalAttempts: count(quizAttempts.id),
            avgScore: avg(quizAttempts.score),
            avgPercentage: sql2`AVG(CAST(${quizAttempts.score} AS FLOAT) / NULLIF(${quizAttempts.totalQuestions}, 0) * 100)`
          }).from(quizAttempts).where(eq3(quizAttempts.contentId, contentId)),
          db.select({ totalInteractions: count(interactionEvents.id) }).from(interactionEvents).where(eq3(interactionEvents.contentId, contentId)),
          db.select().from(learnerProgress).where(eq3(learnerProgress.contentId, contentId)).orderBy(desc2(learnerProgress.lastAccessedAt)).limit(10)
        ]);
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
      async getUserContentAnalytics(userContent) {
        if (userContent.length === 0) return [];
        const contentIds = userContent.map((c) => c.id);
        const [allProgressStats, allQuizStats, allInteractionStats] = await Promise.all([
          db.select({
            contentId: learnerProgress.contentId,
            uniqueViewers: count(learnerProgress.userId),
            avgCompletion: avg(learnerProgress.completionPercentage)
          }).from(learnerProgress).where(inArray(learnerProgress.contentId, contentIds)).groupBy(learnerProgress.contentId),
          db.select({
            contentId: quizAttempts.contentId,
            totalAttempts: count(quizAttempts.id),
            avgScore: avg(quizAttempts.score)
          }).from(quizAttempts).where(inArray(quizAttempts.contentId, contentIds)).groupBy(quizAttempts.contentId),
          db.select({
            contentId: interactionEvents.contentId,
            totalInteractions: count(interactionEvents.id)
          }).from(interactionEvents).where(inArray(interactionEvents.contentId, contentIds)).groupBy(interactionEvents.contentId)
        ]);
        const progressMap = new Map(allProgressStats.map((s) => [s.contentId, s]));
        const quizMap = new Map(allQuizStats.map((s) => [s.contentId, s]));
        const interactionMap = new Map(allInteractionStats.map((s) => [s.contentId, s]));
        return userContent.map((content) => {
          const ps = progressMap.get(content.id);
          const qs = quizMap.get(content.id);
          const is = interactionMap.get(content.id);
          return {
            contentId: content.id,
            title: content.title,
            type: content.type,
            isPublished: content.isPublished,
            createdAt: content.createdAt,
            uniqueViewers: Number(ps?.uniqueViewers || 0),
            avgCompletion: Number(ps?.avgCompletion || 0),
            totalAttempts: Number(qs?.totalAttempts || 0),
            avgScore: Number(qs?.avgScore || 0),
            totalInteractions: Number(is?.totalInteractions || 0)
          };
        });
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
        }).from(learnerProgress).innerJoin(profiles, eq3(learnerProgress.userId, profiles.id)).where(eq3(learnerProgress.contentId, contentId)).orderBy(desc2(learnerProgress.lastAccessedAt));
        const userIds = learners.map((l) => l.userId);
        const allQuizAttempts = userIds.length > 0 ? await db.select({
          userId: quizAttempts.userId,
          score: quizAttempts.score,
          totalQuestions: quizAttempts.totalQuestions,
          completedAt: quizAttempts.completedAt
        }).from(quizAttempts).where(eq3(quizAttempts.contentId, contentId)).orderBy(desc2(quizAttempts.completedAt)) : [];
        const allInteractions = userIds.length > 0 ? await db.select({
          userId: interactionEvents.userId,
          totalInteractions: count(interactionEvents.id)
        }).from(interactionEvents).where(eq3(interactionEvents.contentId, contentId)).groupBy(interactionEvents.userId) : [];
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
        const attempts = await db.select().from(quizAttempts).where(eq3(quizAttempts.contentId, contentId));
        if (attempts.length === 0) {
          return { totalAttempts: 0, questions: [] };
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
          const topIncorrectAnswers = Object.entries(stats.commonIncorrectAnswers).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([answer, count4]) => ({ answer, count: count4 }));
          return {
            ...stats,
            successRate: Math.round(successRate * 10) / 10,
            difficultyScore: Math.round(difficultyScore * 10) / 10,
            commonIncorrectAnswers: topIncorrectAnswers
          };
        });
        return { totalAttempts: attempts.length, questions };
      }
      async getStudentPerformanceDistribution(contentId) {
        const attempts = await db.select({
          userId: quizAttempts.userId,
          score: quizAttempts.score,
          totalQuestions: quizAttempts.totalQuestions,
          completedAt: quizAttempts.completedAt,
          fullName: profiles.fullName,
          email: profiles.email
        }).from(quizAttempts).innerJoin(profiles, eq3(quizAttempts.userId, profiles.id)).where(eq3(quizAttempts.contentId, contentId)).orderBy(desc2(quizAttempts.completedAt));
        if (attempts.length === 0) {
          return { totalStudents: 0, distribution: [], students: [] };
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
        const distribution = Object.entries(ranges).map(([range, count4]) => ({
          range,
          count: count4,
          percentage: Math.round(count4 / attempts.length * 100 * 10) / 10
        }));
        const students = Object.values(studentBestScores).sort((a, b) => b.bestPercentage - a.bestPercentage).map((student) => ({
          ...student,
          bestPercentage: Math.round(student.bestPercentage * 10) / 10
        }));
        return { totalStudents: students.length, totalAttempts: attempts.length, distribution, students };
      }
      async getScoreDistribution(contentId) {
        const attempts = await db.select({ score: quizAttempts.score, totalQuestions: quizAttempts.totalQuestions }).from(quizAttempts).where(eq3(quizAttempts.contentId, contentId));
        if (attempts.length === 0) {
          return { totalAttempts: 0, distribution: [] };
        }
        const buckets = {};
        attempts.forEach((attempt) => {
          const percentage = Math.round(attempt.score / attempt.totalQuestions * 100);
          const bucket = Math.floor(percentage / 10) * 10;
          const bucketKey = `${bucket}-${bucket + 9}%`;
          buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
        });
        const distribution = Object.entries(buckets).map(([range, count4]) => ({
          range,
          count: count4,
          percentage: Math.round(count4 / attempts.length * 100 * 10) / 10
        })).sort((a, b) => parseInt(a.range) - parseInt(b.range));
        return { totalAttempts: attempts.length, distribution };
      }
      async getRecentStudentActivity(teacherContentIds, limit = 10) {
        if (teacherContentIds.length === 0) return [];
        return await db.select({
          progressId: learnerProgress.id,
          studentId: profiles.id,
          studentName: profiles.fullName,
          contentId: h5pContent.id,
          contentTitle: h5pContent.title,
          contentType: h5pContent.type,
          completionPercentage: learnerProgress.completionPercentage,
          lastAccessedAt: learnerProgress.lastAccessedAt
        }).from(learnerProgress).innerJoin(profiles, eq3(learnerProgress.userId, profiles.id)).innerJoin(h5pContent, eq3(learnerProgress.contentId, h5pContent.id)).where(inArray(learnerProgress.contentId, teacherContentIds)).orderBy(desc2(learnerProgress.lastAccessedAt)).limit(limit);
      }
    };
  }
});

// server/repositories/chat-repository.ts
import { eq as eq4, desc as desc3 } from "drizzle-orm";
var ChatRepository;
var init_chat_repository = __esm({
  "server/repositories/chat-repository.ts"() {
    "use strict";
    init_db();
    init_schema();
    ChatRepository = class {
      async create(message) {
        const [chatMessage] = await db.insert(chatMessages).values(message).returning();
        return chatMessage;
      }
      async getHistory(userId, limit = 50) {
        return await db.select().from(chatMessages).where(eq4(chatMessages.userId, userId)).orderBy(desc3(chatMessages.createdAt)).limit(limit);
      }
      async deleteHistory(userId) {
        await db.delete(chatMessages).where(eq4(chatMessages.userId, userId));
      }
    };
  }
});

// server/repositories/class-repository.ts
import { eq as eq5, and as and3, desc as desc4, inArray as inArray2 } from "drizzle-orm";
var ClassRepository;
var init_class_repository = __esm({
  "server/repositories/class-repository.ts"() {
    "use strict";
    init_db();
    init_schema();
    ClassRepository = class {
      // ─── Classes ─────────────────────────────────────────────
      async create(classData) {
        const [class_] = await db.insert(classes).values({
          ...classData,
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return class_;
      }
      async update(id, updates) {
        const [updated] = await db.update(classes).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(classes.id, id)).returning();
        return updated;
      }
      async delete(id) {
        await db.delete(classes).where(eq5(classes.id, id));
      }
      async getById(id) {
        const [class_] = await db.select().from(classes).where(eq5(classes.id, id)).limit(1);
        return class_;
      }
      async getByUserId(userId) {
        return await db.select().from(classes).where(eq5(classes.userId, userId)).orderBy(desc4(classes.createdAt));
      }
      // ─── Enrollments ─────────────────────────────────────────
      async createEnrollment(enrollment) {
        const [enrollment_] = await db.insert(classEnrollments).values(enrollment).returning();
        return enrollment_;
      }
      async deleteEnrollment(classId, userId) {
        await db.delete(classEnrollments).where(and3(eq5(classEnrollments.classId, classId), eq5(classEnrollments.userId, userId)));
      }
      async getEnrollments(classId) {
        return await db.select({
          enrollmentId: classEnrollments.id,
          userId: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          role: profiles.role,
          enrolledAt: classEnrollments.enrolledAt
        }).from(classEnrollments).innerJoin(profiles, eq5(classEnrollments.userId, profiles.id)).where(eq5(classEnrollments.classId, classId)).orderBy(desc4(classEnrollments.enrolledAt));
      }
      async getStudentClasses(userId) {
        return await db.select({
          id: classes.id,
          name: classes.name,
          description: classes.description,
          userId: classes.userId,
          subject: classes.subject,
          gradeLevel: classes.gradeLevel,
          createdAt: classes.createdAt,
          updatedAt: classes.updatedAt
        }).from(classEnrollments).innerJoin(classes, eq5(classEnrollments.classId, classes.id)).where(eq5(classEnrollments.userId, userId)).orderBy(desc4(classes.createdAt));
      }
      async bulkCreateEnrollments(enrollments) {
        if (enrollments.length === 0) return [];
        return await db.insert(classEnrollments).values(enrollments).returning();
      }
      // ─── Content assignments ─────────────────────────────────
      async createAssignment(assignment) {
        const [assignment_] = await db.insert(contentAssignments).values(assignment).returning();
        return assignment_;
      }
      async deleteAssignment(contentId, classId) {
        await db.delete(contentAssignments).where(and3(eq5(contentAssignments.contentId, contentId), eq5(contentAssignments.classId, classId)));
      }
      async getContentAssignments(contentId) {
        return await db.select({
          assignmentId: contentAssignments.id,
          classId: classes.id,
          className: classes.name,
          classDescription: classes.description,
          assignedAt: contentAssignments.assignedAt,
          dueDate: contentAssignments.dueDate,
          instructions: contentAssignments.instructions
        }).from(contentAssignments).innerJoin(classes, eq5(contentAssignments.classId, classes.id)).where(eq5(contentAssignments.contentId, contentId)).orderBy(desc4(contentAssignments.assignedAt));
      }
      async getClassAssignments(classId) {
        return await db.select({
          assignmentId: contentAssignments.id,
          contentId: h5pContent.id,
          contentTitle: h5pContent.title,
          contentType: h5pContent.type,
          assignedAt: contentAssignments.assignedAt,
          dueDate: contentAssignments.dueDate,
          instructions: contentAssignments.instructions
        }).from(contentAssignments).innerJoin(h5pContent, eq5(contentAssignments.contentId, h5pContent.id)).where(eq5(contentAssignments.classId, classId)).orderBy(desc4(contentAssignments.assignedAt));
      }
      async getStudentAssignments(userId) {
        const studentClassIds = await db.select({ classId: classEnrollments.classId }).from(classEnrollments).where(eq5(classEnrollments.userId, userId));
        if (studentClassIds.length === 0) return [];
        const classIds = studentClassIds.map((c) => c.classId);
        return await db.select({
          assignmentId: contentAssignments.id,
          contentId: h5pContent.id,
          contentTitle: h5pContent.title,
          contentType: h5pContent.type,
          classId: classes.id,
          className: classes.name,
          assignedAt: contentAssignments.assignedAt,
          dueDate: contentAssignments.dueDate,
          instructions: contentAssignments.instructions
        }).from(contentAssignments).innerJoin(h5pContent, eq5(contentAssignments.contentId, h5pContent.id)).innerJoin(classes, eq5(contentAssignments.classId, classes.id)).where(inArray2(contentAssignments.classId, classIds)).orderBy(desc4(contentAssignments.assignedAt));
      }
    };
  }
});

// server/storage.ts
import { eq as eq6 } from "drizzle-orm";
var DbStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_profile_repository();
    init_content_repository();
    init_analytics_repository();
    init_chat_repository();
    init_class_repository();
    DbStorage = class {
      profileRepo = new ProfileRepository();
      contentRepo = new ContentRepository();
      analyticsRepo = new AnalyticsRepository();
      chatRepo = new ChatRepository();
      classRepo = new ClassRepository();
      // ─── Profile ─────────────────────────────────────────────
      createProfile(profile) {
        return this.profileRepo.create(profile);
      }
      updateProfile(id, updates) {
        return this.profileRepo.update(id, updates);
      }
      getProfileById(id) {
        return this.profileRepo.getById(id);
      }
      getProfileByEmail(email) {
        return this.profileRepo.getByEmail(email);
      }
      setPasswordResetToken(email, token, expiresAt) {
        return this.profileRepo.setPasswordResetToken(email, token, expiresAt);
      }
      getProfileByResetToken(token) {
        return this.profileRepo.getByResetToken(token);
      }
      clearPasswordResetToken(id) {
        return this.profileRepo.clearPasswordResetToken(id);
      }
      // ─── Content ─────────────────────────────────────────────
      createContent(content) {
        return this.contentRepo.create(content);
      }
      updateContent(id, updates) {
        return this.contentRepo.update(id, updates);
      }
      deleteContent(id) {
        return this.contentRepo.delete(id);
      }
      getContentById(id) {
        return this.contentRepo.getById(id);
      }
      getContentByUserId(userId, limit) {
        return this.contentRepo.getByUserId(userId, limit);
      }
      getPublishedContent(id) {
        return this.contentRepo.getPublished(id);
      }
      getPublicContent() {
        return this.contentRepo.getPublic();
      }
      copyContent(contentId, userId) {
        return this.contentRepo.copy(contentId, userId);
      }
      createShare(share) {
        return this.contentRepo.createShare(share);
      }
      getSharesByContentId(contentId) {
        return this.contentRepo.getSharesByContentId(contentId);
      }
      // ─── Analytics / Progress ────────────────────────────────
      upsertLearnerProgress(progress) {
        return this.analyticsRepo.upsertLearnerProgress(progress);
      }
      getLearnerProgress(userId, contentId) {
        return this.analyticsRepo.getLearnerProgress(userId, contentId);
      }
      getUserProgressByContentId(contentId) {
        return this.analyticsRepo.getUserProgressByContentId(contentId);
      }
      getAllUserProgress(userId) {
        return this.analyticsRepo.getAllUserProgress(userId);
      }
      createQuizAttempt(attempt) {
        return this.analyticsRepo.createQuizAttempt(attempt);
      }
      getQuizAttempts(userId, contentId) {
        return this.analyticsRepo.getQuizAttempts(userId, contentId);
      }
      createInteractionEvent(event) {
        return this.analyticsRepo.createInteractionEvent(event);
      }
      getInteractionEvents(userId, contentId) {
        return this.analyticsRepo.getInteractionEvents(userId, contentId);
      }
      getAllQuizAttemptsForContent(contentId) {
        return this.analyticsRepo.getAllQuizAttemptsForContent(contentId);
      }
      async getContentAnalytics(contentId) {
        const content = await this.contentRepo.getById(contentId);
        return this.analyticsRepo.getContentAnalytics(contentId, content);
      }
      async getUserContentAnalytics(userId) {
        const userContent = await this.contentRepo.getByUserId(userId);
        return this.analyticsRepo.getUserContentAnalytics(userContent);
      }
      getContentLearners(contentId) {
        return this.analyticsRepo.getContentLearners(contentId);
      }
      getQuestionAnalytics(contentId) {
        return this.analyticsRepo.getQuestionAnalytics(contentId);
      }
      getStudentPerformanceDistribution(contentId) {
        return this.analyticsRepo.getStudentPerformanceDistribution(contentId);
      }
      getScoreDistribution(contentId) {
        return this.analyticsRepo.getScoreDistribution(contentId);
      }
      async getRecentStudentActivity(teacherId, limit = 10) {
        const teacherContent = await db.select({ id: h5pContent.id }).from(h5pContent).where(eq6(h5pContent.userId, teacherId));
        return this.analyticsRepo.getRecentStudentActivity(teacherContent.map((c) => c.id), limit);
      }
      // ─── Chat ────────────────────────────────────────────────
      createChatMessage(message) {
        return this.chatRepo.create(message);
      }
      getChatHistory(userId, limit) {
        return this.chatRepo.getHistory(userId, limit);
      }
      deleteChatHistory(userId) {
        return this.chatRepo.deleteHistory(userId);
      }
      // ─── Classes ─────────────────────────────────────────────
      createClass(classData) {
        return this.classRepo.create(classData);
      }
      updateClass(id, updates) {
        return this.classRepo.update(id, updates);
      }
      deleteClass(id) {
        return this.classRepo.delete(id);
      }
      getClassById(id) {
        return this.classRepo.getById(id);
      }
      getClassesByUserId(userId) {
        return this.classRepo.getByUserId(userId);
      }
      createClassEnrollment(enrollment) {
        return this.classRepo.createEnrollment(enrollment);
      }
      deleteClassEnrollment(classId, userId) {
        return this.classRepo.deleteEnrollment(classId, userId);
      }
      getClassEnrollments(classId) {
        return this.classRepo.getEnrollments(classId);
      }
      getStudentClasses(userId) {
        return this.classRepo.getStudentClasses(userId);
      }
      bulkCreateEnrollments(enrollments) {
        return this.classRepo.bulkCreateEnrollments(enrollments);
      }
      createContentAssignment(assignment) {
        return this.classRepo.createAssignment(assignment);
      }
      deleteContentAssignment(contentId, classId) {
        return this.classRepo.deleteAssignment(contentId, classId);
      }
      getContentAssignments(contentId) {
        return this.classRepo.getContentAssignments(contentId);
      }
      getClassAssignments(classId) {
        return this.classRepo.getClassAssignments(classId);
      }
      getStudentAssignments(userId) {
        return this.classRepo.getStudentAssignments(userId);
      }
    };
    storage = new DbStorage();
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

// server/services/auth-service.ts
import bcrypt3 from "bcryptjs";
import crypto2 from "crypto";
function stripPassword(profile) {
  const { password: _, ...safe } = profile;
  return safe;
}
var AuthService;
var init_auth_service = __esm({
  "server/services/auth-service.ts"() {
    "use strict";
    AuthService = class {
      constructor(storage2) {
        this.storage = storage2;
      }
      async register(input) {
        if (!input.email || !input.password || !input.fullName) {
          return { ok: false, status: 400, message: "Missing required fields" };
        }
        const existing = await this.storage.getProfileByEmail(input.email);
        if (existing) {
          return { ok: false, status: 400, message: "Email already registered" };
        }
        const profile = await this.storage.createProfile({
          email: input.email,
          password: input.password,
          fullName: input.fullName,
          role: input.role || "teacher",
          institution: input.institution || null
        });
        return { ok: true, data: stripPassword(profile) };
      }
      async login(email, password) {
        if (!email || !password) {
          return { ok: false, status: 400, message: "Missing email or password" };
        }
        const profile = await this.storage.getProfileByEmail(email);
        if (!profile || !profile.password) {
          return { ok: false, status: 401, message: "Invalid credentials" };
        }
        const isValid = await bcrypt3.compare(password, profile.password);
        if (!isValid) {
          return { ok: false, status: 401, message: "Invalid credentials" };
        }
        return { ok: true, data: stripPassword(profile) };
      }
      async getProfile(userId) {
        const profile = await this.storage.getProfileById(userId);
        if (!profile) {
          return { ok: false, status: 404, message: "Profile not found" };
        }
        return { ok: true, data: stripPassword(profile) };
      }
      async requestPasswordReset(email) {
        if (!email || typeof email !== "string") return null;
        const normalizedEmail = email.trim().toLowerCase();
        const profile = await this.storage.getProfileByEmail(normalizedEmail);
        if (!profile) return null;
        const resetToken = crypto2.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
        await this.storage.setPasswordResetToken(normalizedEmail, resetToken, expiresAt);
        return { token: resetToken, profile };
      }
      async resetPassword(token, newPassword) {
        if (!token || typeof token !== "string") {
          return { ok: false, status: 400, message: "Reset token is required" };
        }
        if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
          return { ok: false, status: 400, message: "Password must be at least 6 characters" };
        }
        const profile = await this.storage.getProfileByResetToken(token);
        if (!profile) {
          return { ok: false, status: 400, message: "Invalid or expired reset token" };
        }
        if (!profile.passwordResetExpiry || /* @__PURE__ */ new Date() > new Date(profile.passwordResetExpiry)) {
          return { ok: false, status: 400, message: "Reset token has expired. Please request a new one." };
        }
        await this.storage.updateProfile(profile.id, { password: newPassword });
        await this.storage.clearPasswordResetToken(profile.id);
        return { ok: true, data: { message: "Password has been reset successfully. You can now log in with your new password." } };
      }
      async validateResetToken(token) {
        if (!token) return { valid: false, message: "Token is required" };
        const profile = await this.storage.getProfileByResetToken(token);
        if (!profile) return { valid: false, message: "Invalid reset token" };
        if (!profile.passwordResetExpiry || /* @__PURE__ */ new Date() > new Date(profile.passwordResetExpiry)) {
          return { valid: false, message: "Reset token has expired" };
        }
        return { valid: true, email: profile.email };
      }
      async changePassword(userId, currentPassword, newPassword) {
        if (!currentPassword || !newPassword) {
          return { ok: false, status: 400, message: "Current password and new password are required" };
        }
        if (newPassword.length < 8) {
          return { ok: false, status: 400, message: "New password must be at least 8 characters long" };
        }
        const profile = await this.storage.getProfileById(userId);
        if (!profile || !profile.password) {
          return { ok: false, status: 400, message: "Password change not available for OAuth accounts" };
        }
        const isValid = await bcrypt3.compare(currentPassword, profile.password);
        if (!isValid) {
          return { ok: false, status: 401, message: "Current password is incorrect" };
        }
        const hashedPassword = await bcrypt3.hash(newPassword, 10);
        const updated = await this.storage.updateProfile(userId, { password: hashedPassword });
        if (!updated) {
          return { ok: false, status: 404, message: "Profile not found" };
        }
        return { ok: true, data: { message: "Password updated successfully" } };
      }
      /**
       * Find or create a user from an OAuth provider.
       * Returns the profile (creating one if needed) and whether the user is new.
       */
      async findOrCreateOAuthUser(opts) {
        let user = await this.storage.getProfileByEmail(opts.email);
        if (!user) {
          const sentinelPassword = await bcrypt3.hash(crypto2.randomBytes(32).toString("hex"), 10);
          user = await this.storage.createProfile({
            email: opts.email,
            password: sentinelPassword,
            fullName: opts.fullName,
            role: "teacher",
            institution: null,
            authProvider: opts.provider,
            googleId: opts.provider === "google" ? opts.providerId : null,
            microsoftId: opts.provider === "microsoft" ? opts.providerId : null
          });
          if (opts.googleAccessToken) {
            await this.storage.updateProfile(user.id, {
              googleAccessToken: opts.googleAccessToken,
              googleRefreshToken: opts.googleRefreshToken
            });
          }
          return { profile: user, isNew: true };
        }
        const updates = {};
        if (opts.provider === "microsoft" && !user.microsoftId) {
          updates.microsoftId = opts.providerId;
        }
        if (opts.provider === "google" && !user.googleId) {
          updates.googleId = opts.providerId;
        }
        if (Object.keys(updates).length > 0) {
          await this.storage.updateProfile(user.id, updates);
        }
        return { profile: user, isNew: false };
      }
    };
  }
});

// server/utils/async-handler.ts
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
var init_async_handler = __esm({
  "server/utils/async-handler.ts"() {
    "use strict";
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

// server/routes/auth.ts
function registerAuthRoutes({ app: app2, storage: storage2 }, isGoogleOAuthAvailable, isMicrosoftOAuthAvailable) {
  const auth = new AuthService(storage2);
  app2.post("/api/auth/register", asyncHandler(async (req, res) => {
    const result = await auth.register(req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    req.session.userId = result.data.id;
    await new Promise((resolve, reject) => {
      req.session.save((err) => err ? reject(err) : resolve());
    });
    res.json(result.data);
  }));
  app2.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await auth.login(email, password);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    req.session.userId = result.data.id;
    await new Promise((resolve, reject) => {
      req.session.save((err) => err ? reject(err) : resolve());
    });
    res.json(result.data);
  }));
  app2.get("/api/auth/me", (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  }, asyncHandler(async (req, res) => {
    const result = await auth.getProfile(req.session.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.get("/api/auth/providers", (_req, res) => {
    res.json({ google: isGoogleOAuthAvailable, microsoft: isMicrosoftOAuthAvailable });
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.post("/api/auth/forgot-password", asyncHandler(async (req, res) => {
    const result = await auth.requestPasswordReset(req.body.email);
    const successMsg = "If an account exists with that email, a password reset link will be sent.";
    if (!result) return res.json({ message: successMsg });
    const { sendPasswordResetEmail: sendPasswordResetEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
    await sendPasswordResetEmail2(result.profile.email, result.profile.fullName, result.token);
    res.json({ message: successMsg });
  }));
  app2.post("/api/auth/reset-password", asyncHandler(async (req, res) => {
    const result = await auth.resetPassword(req.body.token, req.body.password);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.get("/api/auth/validate-reset-token", asyncHandler(async (req, res) => {
    const result = await auth.validateResetToken(req.query.token);
    if (!result.valid) return res.status(result.message === "Token is required" ? 400 : 200).json(result);
    res.json(result);
  }));
  app2.get("/api/auth/google", (req, res, next) => {
    if (!isGoogleOAuthAvailable) {
      return res.status(503).json({
        message: "Google authentication is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      });
    }
    const returnTo = req.query.returnTo;
    if (returnTo && returnTo.startsWith("/")) req.session.oauthReturnTo = returnTo;
    passport_config_default.authenticate("google", {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/presentations",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.students",
        "https://www.googleapis.com/auth/classroom.announcements"
      ],
      accessType: "offline",
      prompt: "consent"
    })(req, res, next);
  });
  app2.get("/api/auth/google/callback", (req, res, next) => {
    if (!isGoogleOAuthAvailable) return res.redirect("/login?error=google_not_configured");
    passport_config_default.authenticate("google", {
      failureRedirect: "/login?error=google_auth_failed",
      failureMessage: true
    }, (err, user) => {
      if (err) {
        console.error("[Google OAuth] Authentication error:", err);
        return res.redirect("/login?error=google_auth_error&message=" + encodeURIComponent(err.message || "Unknown error"));
      }
      if (!user) return res.redirect("/login?error=google_no_user");
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("[Google OAuth] Login error:", loginErr);
          return res.redirect("/login?error=login_failed");
        }
        req.session.userId = user.id;
        const returnTo = req.session.oauthReturnTo;
        delete req.session.oauthReturnTo;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[Google OAuth] Session save error:", saveErr);
            return res.redirect("/login?error=session_save_failed");
          }
          const target = returnTo && returnTo.startsWith("/") && !returnTo.includes("//") ? returnTo + "?googleAuthSuccess=true" : "/dashboard?googleAuthSuccess=true";
          res.redirect(target);
        });
      });
    })(req, res, next);
  });
  app2.get("/api/auth/microsoft", asyncHandler(async (req, res) => {
    if (!isMicrosoftOAuthAvailable) {
      return res.status(503).json({
        message: "Microsoft authentication is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET."
      });
    }
    const returnTo = req.query.returnTo;
    if (returnTo && returnTo.startsWith("/")) req.session.oauthReturnTo = returnTo;
    const msalClient = getMsalClient();
    if (!msalClient) return res.status(503).json({ message: "Microsoft OAuth client not configured" });
    const redirectUri = getRedirectUri(req);
    const authUrl = await msalClient.getAuthCodeUrl({ scopes: ["user.read"], redirectUri });
    res.redirect(authUrl);
  }));
  app2.get("/api/auth/microsoft/callback", asyncHandler(async (req, res) => {
    if (!isMicrosoftOAuthAvailable) return res.redirect("/login?error=microsoft_not_configured");
    if (req.query.error) return res.redirect(`/login?error=${req.query.error}`);
    if (!req.query.code) return res.redirect("/login?error=no_code");
    const msalClient = getMsalClient();
    if (!msalClient) return res.redirect("/login?error=microsoft_not_configured");
    const redirectUri = getRedirectUri(req);
    const response = await msalClient.acquireTokenByCode({
      code: req.query.code,
      scopes: ["user.read"],
      redirectUri
    });
    if (!response || !response.account) return res.redirect("/login?error=microsoft_no_account");
    let email = null;
    let name = null;
    try {
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${response.accessToken}` }
      });
      if (graphResponse.ok) {
        const userInfo = await graphResponse.json();
        email = userInfo.mail || userInfo.userPrincipalName || userInfo.email;
        name = userInfo.displayName || userInfo.givenName || userInfo.name;
      }
    } catch {
    }
    if (!email) {
      const account = response.account;
      email = account.username || account.localAccountId;
      name = name || account.name || account.username?.split("@")[0] || "User";
    }
    const microsoftId = response.account.homeAccountId;
    if (!email) return res.redirect("/login?error=microsoft_no_email");
    const { profile } = await auth.findOrCreateOAuthUser({
      email,
      fullName: name || email,
      provider: "microsoft",
      providerId: microsoftId
    });
    req.session.userId = profile.id;
    const returnTo = req.session.oauthReturnTo;
    delete req.session.oauthReturnTo;
    req.session.save((err) => {
      if (err) {
        console.error("Microsoft OAuth: Session save error:", err);
        return res.redirect("/login?error=session_failed");
      }
      const target = returnTo && returnTo.startsWith("/") && !returnTo.includes("//") ? returnTo + "?microsoftAuthSuccess=true" : "/dashboard?microsoftAuthSuccess=true";
      res.redirect(target);
    });
  }));
}
var init_auth = __esm({
  "server/routes/auth.ts"() {
    "use strict";
    init_passport_config();
    init_msal_config();
    init_auth_service();
    init_async_handler();
  }
});

// server/utils/content-filters.ts
function extractSubjectAndGrade(content) {
  try {
    const data = content.data;
    if (content.type === "video-finder" && data?.searchCriteria) {
      return {
        subject: data.searchCriteria.subject || null,
        grade: data.searchCriteria.gradeLevel || null
      };
    }
    if (content.type === "presentation" && data) {
      return { subject: null, grade: data.gradeLevel || null };
    }
    if (content.type === "interactive-book" && data) {
      return { subject: data.subject || null, grade: data.gradeLevel || null };
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
}
function filterContent(contents, query) {
  let result = contents;
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    result = result.filter(
      (c) => c.title.toLowerCase().includes(searchLower) || c.description && c.description.toLowerCase().includes(searchLower)
    );
  }
  if (query.type) {
    result = result.filter((c) => c.type === query.type);
  }
  if (query.subject) {
    const subjectLower = query.subject.toLowerCase();
    result = result.filter((c) => {
      const { subject } = extractSubjectAndGrade(c);
      return subject && subject.toLowerCase() === subjectLower;
    });
  }
  if (query.grade) {
    const gradeLower = query.grade.toLowerCase();
    result = result.filter((c) => {
      const { grade } = extractSubjectAndGrade(c);
      return grade && grade.toLowerCase() === gradeLower;
    });
  }
  if (query.tags) {
    const tagList = query.tags.split(",").map((t) => t.trim().toLowerCase());
    result = result.filter(
      (c) => c.tags && c.tags.some((tag) => tagList.includes(tag.toLowerCase()))
    );
  }
  if (query.startDate) {
    const start = new Date(query.startDate);
    if (!isNaN(start.getTime())) {
      result = result.filter((c) => {
        if (!c.updatedAt) return false;
        const updated = new Date(c.updatedAt);
        return !isNaN(updated.getTime()) && updated >= start;
      });
    }
  }
  if (query.endDate) {
    const end = new Date(query.endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      result = result.filter((c) => {
        if (!c.updatedAt) return false;
        const updated = new Date(c.updatedAt);
        return !isNaN(updated.getTime()) && updated <= end;
      });
    }
  }
  return result;
}
var init_content_filters = __esm({
  "server/utils/content-filters.ts"() {
    "use strict";
  }
});

// server/services/content-service.ts
var ContentService;
var init_content_service = __esm({
  "server/services/content-service.ts"() {
    "use strict";
    init_content_filters();
    ContentService = class {
      constructor(storage2) {
        this.storage = storage2;
      }
      async getUserContent(userId, query = {}) {
        const contents = await this.storage.getContentByUserId(userId);
        return filterContent(contents, query);
      }
      async getPublicContent(query = {}) {
        const contents = await this.storage.getPublicContent();
        return filterContent(contents, query);
      }
      async getById(id, userId, userRole) {
        const content = await this.storage.getContentById(id);
        if (!content) return { ok: false, status: 404, message: "Content not found" };
        if (content.userId === userId) return { ok: true, data: content };
        if (userRole === "admin") return { ok: true, data: content };
        if (userRole === "student") {
          const assignments = await this.storage.getStudentAssignments(userId);
          const isAssigned = assignments.some((a) => a.contentId === id);
          if (isAssigned) return { ok: true, data: content };
          if (content.isPublished && content.isPublic) return { ok: true, data: content };
        }
        return { ok: false, status: 403, message: "Forbidden" };
      }
      async create(userId, input) {
        if (!input.title || !input.type || !input.data) {
          return { ok: false, status: 400, message: "Missing required fields" };
        }
        const content = await this.storage.createContent({
          title: input.title,
          description: input.description || null,
          type: input.type,
          data: input.data,
          userId,
          isPublished: input.isPublished || false,
          isPublic: input.isPublic || false,
          tags: input.tags || null,
          subject: input.subject || null,
          gradeLevel: input.gradeLevel || null,
          ageRange: input.ageRange || null,
          curriculumContext: input.curriculumContext || null
        });
        return { ok: true, data: content };
      }
      async update(id, userId, updates) {
        const existing = await this.storage.getContentById(id);
        if (!existing) return { ok: false, status: 404, message: "Content not found" };
        if (existing.userId !== userId) return { ok: false, status: 403, message: "Forbidden" };
        const updated = await this.storage.updateContent(id, updates);
        if (!updated) return { ok: false, status: 500, message: "Failed to update content" };
        return { ok: true, data: updated };
      }
      async delete(id, userId) {
        const existing = await this.storage.getContentById(id);
        if (!existing) return { ok: false, status: 404, message: "Content not found" };
        if (existing.userId !== userId) return { ok: false, status: 403, message: "Forbidden" };
        await this.storage.deleteContent(id);
        return { ok: true, data: { message: "Content deleted successfully" } };
      }
      async share(id, userId) {
        const content = await this.storage.getContentById(id);
        if (!content) return { ok: false, status: 404, message: "Content not found" };
        if (content.userId !== userId) return { ok: false, status: 403, message: "Forbidden" };
        if (!content.isPublished) {
          await this.storage.updateContent(id, { isPublished: true });
        }
        const share = await this.storage.createShare({ contentId: id, sharedBy: userId });
        return { ok: true, data: share };
      }
      async duplicate(id, userId) {
        const content = await this.storage.getContentById(id);
        if (!content) return { ok: false, status: 404, message: "Content not found" };
        if (content.userId !== userId) return { ok: false, status: 403, message: "Forbidden" };
        const duplicated = await this.storage.createContent({
          userId,
          title: `${content.title} (Copy)`,
          description: content.description,
          type: content.type,
          data: content.data,
          tags: content.tags,
          subject: content.subject,
          gradeLevel: content.gradeLevel,
          ageRange: content.ageRange,
          isPublished: false,
          isPublic: false
        });
        return { ok: true, data: duplicated };
      }
      async copy(id, userId) {
        try {
          const copiedContent = await this.storage.copyContent(id, userId);
          return { ok: true, data: copiedContent };
        } catch (error) {
          if (error.message === "Content not found") return { ok: false, status: 404, message: error.message };
          if (error.message === "Content must be published and public to be copied") return { ok: false, status: 403, message: error.message };
          throw error;
        }
      }
      async getPublished(id) {
        const content = await this.storage.getPublishedContent(id);
        if (!content) return { ok: false, status: 404, message: "Content not found or not published" };
        return { ok: true, data: content };
      }
      /** Verify the calling user owns the content. Returns the content or error. */
      async verifyOwnership(contentId, userId) {
        const content = await this.storage.getContentById(contentId);
        if (!content || content.userId !== userId) {
          return { ok: false, status: 403, message: "Not authorized" };
        }
        return { ok: true, data: content };
      }
    };
  }
});

// server/routes/content.ts
function registerContentRoutes({ app: app2, storage: storage2, requireAuth, requireTeacher }) {
  const contentSvc = new ContentService(storage2);
  app2.get("/api/content", requireTeacher, asyncHandler(async (req, res) => {
    const contents = await contentSvc.getUserContent(req.session.userId, req.query);
    res.json(contents);
  }));
  app2.get("/api/content/public", requireTeacher, asyncHandler(async (req, res) => {
    const contents = await contentSvc.getPublicContent(req.query);
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.json(contents);
  }));
  app2.get("/api/content/:id", requireAuth, asyncHandler(async (req, res) => {
    const user = await storage2.getProfileById(req.session.userId);
    const result = await contentSvc.getById(req.params.id, req.session.userId, user?.role);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.post("/api/content", requireTeacher, asyncHandler(async (req, res) => {
    const result = await contentSvc.create(req.session.userId, req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.put("/api/content/:id", requireTeacher, asyncHandler(async (req, res) => {
    const { title, description, data, isPublished, isPublic, tags, subject, gradeLevel, ageRange, curriculumContext } = req.body;
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
    updates.curriculumContext = curriculumContext ?? null;
    const result = await contentSvc.update(req.params.id, req.session.userId, updates);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.delete("/api/content/:id", requireTeacher, asyncHandler(async (req, res) => {
    const result = await contentSvc.delete(req.params.id, req.session.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.post("/api/content/:id/share", requireTeacher, asyncHandler(async (req, res) => {
    const result = await contentSvc.share(req.params.id, req.session.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.post("/api/content/:id/duplicate", requireTeacher, asyncHandler(async (req, res) => {
    const result = await contentSvc.duplicate(req.params.id, req.session.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.post("/api/content/:id/copy", requireTeacher, asyncHandler(async (req, res) => {
    const result = await contentSvc.copy(req.params.id, req.session.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.get("/api/preview/:id", asyncHandler(async (req, res) => {
    const result = await contentSvc.getPublished(req.params.id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
}
var init_content = __esm({
  "server/routes/content.ts"() {
    "use strict";
    init_content_service();
    init_async_handler();
  }
});

// server/utils/openai-helper.ts
async function callOpenAIJSON(options, extractKey) {
  const {
    systemMessage,
    prompt,
    maxTokens = 4096,
    temperature = 0.7,
    timeout = 3e4
  } = options;
  const response = await getOpenAIClient().chat.completions.create(
    {
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
      temperature
    },
    { timeout }
  );
  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return extractKey ? result[extractKey] ?? [] : result;
  } catch (parseError) {
    console.error("Failed to parse OpenAI JSON response:", parseError);
    throw new Error("Received invalid response from AI. Please try again.");
  }
}
var init_openai_helper = __esm({
  "server/utils/openai-helper.ts"() {
    "use strict";
    init_openai();
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
    });
  }
  return openai;
}
function buildCurriculumBlock(ctx) {
  if (!ctx) return "";
  const lines = [
    "\n\nOECS HARMONISED PRIMARY CURRICULUM ALIGNMENT:",
    `- Subject: ${ctx.subject}`,
    `- Grade: ${ctx.grade}`,
    `- Strand: ${ctx.strand}`,
    `- Essential Learning Outcome (ELO): ${ctx.eloText}`
  ];
  if (ctx.scoTexts && ctx.scoTexts.length > 0) {
    lines.push("- Specific Curriculum Outcomes (SCOs):");
    ctx.scoTexts.forEach((sco, i) => lines.push(`  ${i + 1}. ${sco}`));
  }
  lines.push(
    "",
    "IMPORTANT: All generated content MUST directly align with the curriculum outcomes listed above.",
    "Ensure questions, activities, and explanations target the specific skills and knowledge described in the ELO and SCOs."
  );
  return lines.join("\n");
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
Additional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

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
  return callOpenAIJSON(
    { systemMessage: EDUCATOR_SYSTEM("quiz questions"), prompt },
    "questions"
  );
}
async function generateFlashcards(request) {
  const prompt = `Generate ${request.numberOfItems} flashcard pairs about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Front: term, concept, or question
- Back: definition, explanation, or answer
- Include a category for each card
- Make them educational and memorable
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

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
  return callOpenAIJSON(
    { systemMessage: EDUCATOR_SYSTEM("flashcards"), prompt },
    "cards"
  );
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
- Additional Requirements: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}${videoInfo}

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
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0,
      "questions": [
        {
          "id": "question-id-1",
          "type": "multiple-choice" | "true-false" | "fill-blank",
          "question": "Question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": 0,
          "explanation": "Optional explanation for the answer"
        }
      ]
    }
  ]
}

IMPORTANT: Ensure all timestamps are valid (0 to ${totalSeconds} seconds) and hotspots are distributed throughout the video duration.`;
  const hotspots = await callOpenAIJSON(
    {
      systemMessage: "You are an expert educator creating interactive video content. Always respond with valid JSON. Ensure all timestamps are within the video duration.",
      prompt
    },
    "hotspots"
  );
  return hotspots.map((hotspot) => ({
    ...hotspot,
    timestamp: Math.min(Math.max(0, hotspot.timestamp), totalSeconds)
  }));
}
function calculateTimestamps(count4, duration) {
  if (count4 <= 0 || duration <= 0) return [];
  const timestamps = [];
  if (count4 === 1) {
    timestamps.push(Math.floor(duration * 0.5));
  } else if (count4 === 2) {
    timestamps.push(Math.floor(duration * 0.3));
    timestamps.push(Math.floor(duration * 0.7));
  } else if (count4 === 3) {
    timestamps.push(Math.floor(duration * 0.15));
    timestamps.push(Math.floor(duration * 0.5));
    timestamps.push(Math.floor(duration * 0.85));
  } else {
    const introEnd = Math.floor(duration * 0.15);
    const conclusionStart = Math.floor(duration * 0.85);
    const middleRange = conclusionStart - introEnd;
    timestamps.push(Math.floor(duration * 0.1));
    const middleHotspots = count4 - 2;
    for (let i = 1; i <= middleHotspots; i++) {
      timestamps.push(Math.floor(introEnd + middleRange * i / (middleHotspots + 1)));
    }
    timestamps.push(Math.floor(duration * 0.9));
  }
  return timestamps.sort((a, b) => a - b);
}
async function generateImageHotspots(request) {
  const prompt = `Generate ${request.numberOfItems} image hotspot descriptions for "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each hotspot represents a point of interest on an image
- Include x,y coordinates (as percentages 0-100) that would make sense for a typical educational diagram
- Provide title and detailed description
- Make them educational and informative
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

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
  return callOpenAIJSON(
    { systemMessage: EDUCATOR_SYSTEM("interactive image content"), prompt },
    "hotspots"
  );
}
async function generateDragDropItems(request) {
  const prompt = `Generate a drag-and-drop activity about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Create 3-5 drop zones (categories)
- Create ${request.numberOfItems} draggable items that belong to these zones
- Each item should have a clear association with one zone
- Make it educational and intuitive
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

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
  return callOpenAIJSON(
    { systemMessage: EDUCATOR_SYSTEM("interactive drag-and-drop activities"), prompt }
  );
}
async function generateFillBlanksBlanks(request) {
  const prompt = `Generate a fill-in-the-blanks exercise about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Create a passage with ${request.numberOfItems} blanks marked as *blank*
- For each blank, provide correct answers (including acceptable variations)
- Optionally include hints
- Make it educational and clear
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

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
  return callOpenAIJSON(
    { systemMessage: EDUCATOR_SYSTEM("fill-in-the-blanks exercises"), prompt }
  );
}
async function generateMemoryGameCards(request) {
  const prompt = `Generate ${request.numberOfItems} matching card pairs for a memory game about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each pair should have two matching items (term-definition, question-answer, etc.)
- Make the matches clear and educational
- Content should be concise to fit on cards
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

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
  return callOpenAIJSON(
    { systemMessage: EDUCATOR_SYSTEM("memory game cards"), prompt },
    "cards"
  );
}
async function generateInteractiveBookPages(request) {
  const prompt = `Generate ${request.numberOfItems} pages for an interactive educational book about "${request.topic}" at ${request.difficulty} difficulty level${request.gradeLevel ? ` for ${request.gradeLevel}` : ""}.

Requirements:
- Each page should have a title and informative content
- Progress logically from page to page
- Make content engaging and educational
- Keep each page focused on one concept
${request.additionalContext ? `
Additional context: ${request.additionalContext}` : ""}${buildCurriculumBlock(request.curriculumContext)}

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
  return callOpenAIJSON(
    { systemMessage: EDUCATOR_SYSTEM("interactive educational books"), prompt },
    "pages"
  );
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
  const result = await callOpenAIJSON(
    { systemMessage: EDUCATOR_SYSTEM("video viewing guides"), prompt, maxTokens: 2048 }
  );
  return {
    viewingInstructions: result.viewingInstructions || "",
    guidingQuestions: result.guidingQuestions || []
  };
}
async function generatePresentation(request) {
  const learningOutcomesText = request.learningOutcomes.map((o, i) => `${i + 1}. ${o}`).join("\n");
  const customInstructionsSection = request.customInstructions ? `

Additional Teacher Instructions:
${request.customInstructions}

Please carefully follow these custom instructions from the teacher when creating the presentation.` : "";
  const curriculumSection = buildCurriculumBlock(request.curriculumContext);
  const contentSlideCount = request.numberOfSlides - 6;
  const prompt = `Create a pedagogically sound, visually varied presentation about "${request.topic}" for grade ${request.gradeLevel} students (age ${request.ageRange}).

Learning Outcomes:
${learningOutcomesText}${customInstructionsSection}${curriculumSection}

Create exactly ${request.numberOfSlides} slides using a MIX of these slide types for visual variety:

REQUIRED SLIDE SEQUENCE:
1. **title** \u2014 Engaging title, brief subtitle. Add emoji to the title (e.g. "\u{1F30A} The Water Cycle").
2. **learning-outcomes** \u2014 List learning outcomes as numbered bullet points. Use emoji "\u{1F3AF}".
3-${request.numberOfSlides - 4}. **CONTENT SLIDES** (${contentSlideCount} slides) \u2014 Mix these types:
   - **content** \u2014 Standard slide with title, body text, and/or bullet points. Include emoji in titles.
   - **vocabulary** \u2014 Key terms with definitions (use "terms" array). Use for introducing new terminology.
   - **comparison** \u2014 Two-column comparison (leftHeading/leftPoints vs rightHeading/rightPoints). Great for compare/contrast.
   - **activity** \u2014 Student task or exercise. Use emoji "\u270F\uFE0F" or "\u{1F914}". Frame as clear instructions.
   - **image** \u2014 Image-focused content slide.
${request.numberOfSlides - 3}. **guiding-questions** \u2014 4-6 thought-provoking questions (recall \u2192 analysis \u2192 application).
${request.numberOfSlides - 2}. **reflection** \u2014 2-3 deeper reflection questions.
${request.numberOfSlides - 1}. **summary** \u2014 Key takeaways as bullet points. Summarize main concepts.
${request.numberOfSlides}. **closing** \u2014 Thank you / questions slide.

IMPORTANT RULES:
- Use AT LEAST 3 different slide types among the content slides (don't use only "content")
- Include at least 1 "vocabulary" slide if the topic has key terms
- Include at least 1 "activity" slide with a student task
- Add a relevant emoji at the start of EVERY slide title (e.g. "\u{1F52C} The Scientific Method", "\u{1F4D6} Key Vocabulary")
- At least 40% of content slides should have an imageUrl (a 2-4 word search query for stock photos)

CARIBBEAN CONTEXT:
This is for teachers in the Organisation of Eastern Caribbean States (OECS). Where appropriate:
- Use examples from Caribbean geography, culture, and daily life
- Reference Caribbean ecosystems (coral reefs, rainforests, volcanic islands)
- Include examples from Caribbean industries (tourism, agriculture, fishing)
- Use relatable scenarios for Caribbean students
- This is a suggestion \u2014 only apply when it naturally fits the topic

SPEAKER NOTES FORMAT:
Every slide MUST have detailed speaker notes structured as:
"\u23F1 Timing: X minutes | \u{1F4A1} Key point: [main takeaway] | \u{1F5E3} Say: [suggested talking point] | \u2753 Ask: [discussion prompt] | \u{1F504} Differentiation: [tip for different learners]"

IMAGE REQUIREMENTS:
- imageUrl should be a short search query (2-4 words): "coral reef ecosystem", "volcanic island", "students laboratory"
- Always include imageAlt with detailed accessibility description
- Images should enhance understanding, not just decorate

Respond in JSON format:
{
  "slides": [
    {
      "id": "slide-1",
      "type": "title",
      "title": "\u{1F30A} The Water Cycle",
      "subtitle": "Understanding Earth's most important process",
      "emoji": "\u{1F30A}",
      "notes": "\u23F1 Timing: 1 min | \u{1F4A1} Key point: Set the stage | \u{1F5E3} Say: Welcome to today's lesson..."
    },
    {
      "id": "slide-2",
      "type": "learning-outcomes",
      "title": "\u{1F3AF} Learning Outcomes",
      "emoji": "\u{1F3AF}",
      "bulletPoints": ["Outcome 1", "Outcome 2"],
      "notes": "..."
    },
    {
      "id": "slide-3",
      "type": "vocabulary",
      "title": "\u{1F4DA} Key Vocabulary",
      "emoji": "\u{1F4DA}",
      "terms": [
        { "term": "Evaporation", "definition": "The process of water turning from liquid to gas" }
      ],
      "notes": "..."
    },
    {
      "id": "slide-4",
      "type": "content",
      "title": "\u{1F52C} How It Works",
      "emoji": "\u{1F52C}",
      "bulletPoints": ["point 1", "point 2"],
      "imageUrl": "water cycle diagram",
      "imageAlt": "Diagram showing the stages of the water cycle",
      "notes": "..."
    },
    {
      "id": "slide-5",
      "type": "comparison",
      "title": "\u2696\uFE0F Evaporation vs Condensation",
      "emoji": "\u2696\uFE0F",
      "leftHeading": "Evaporation",
      "leftPoints": ["Liquid to gas", "Happens at surface"],
      "rightHeading": "Condensation",
      "rightPoints": ["Gas to liquid", "Forms clouds"],
      "notes": "..."
    },
    {
      "id": "slide-6",
      "type": "activity",
      "title": "\u270F\uFE0F Class Activity",
      "emoji": "\u270F\uFE0F",
      "bulletPoints": ["Step 1: ...", "Step 2: ..."],
      "notes": "..."
    },
    {
      "id": "slide-N-3",
      "type": "guiding-questions",
      "title": "\u2753 Guiding Questions",
      "questions": ["Question 1?", "Question 2?"],
      "notes": "..."
    },
    {
      "id": "slide-N-2",
      "type": "reflection",
      "title": "\u{1F4AD} Reflection",
      "questions": ["Reflection question 1?"],
      "notes": "..."
    },
    {
      "id": "slide-N-1",
      "type": "summary",
      "title": "\u{1F4DD} Summary",
      "bulletPoints": ["Key takeaway 1", "Key takeaway 2"],
      "notes": "..."
    },
    {
      "id": "slide-N",
      "type": "closing",
      "title": "\u{1F64F} Thank You!",
      "subtitle": "Any questions? Let's discuss!",
      "notes": "..."
    }
  ]
}`;
  return callOpenAIJSON(
    {
      systemMessage: "You are an expert Caribbean instructional designer creating visually engaging educational presentations for OECS schools. Always respond with valid JSON. Follow Universal Design for Learning (UDL) principles. Create varied, impactful slides that keep students engaged.",
      prompt,
      maxTokens: 6e3,
      timeout: 5e4
    },
    "slides"
  );
}
var openai, EDUCATOR_SYSTEM;
var init_openai = __esm({
  "server/openai.ts"() {
    "use strict";
    init_openai_helper();
    openai = null;
    EDUCATOR_SYSTEM = (role) => `You are an expert educator creating ${role}. Always respond with valid JSON.`;
  }
});

// server/middleware/timeout.ts
function withTimeoutMiddleware(ms = 25e3) {
  return (_req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          message: "Request timeout - The AI generation is taking longer than expected. Please try again with fewer items or simpler content."
        });
      }
    }, ms);
    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };
}
var init_timeout = __esm({
  "server/middleware/timeout.ts"() {
    "use strict";
  }
});

// server/middleware/rate-limit.ts
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
var rateLimitStore, aiGenerationRateLimit, presentationCreationRateLimit, aiImageGenerationRateLimit, imageSearchRateLimit, generalApiRateLimit;
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
    aiImageGenerationRateLimit = rateLimit({
      maxRequests: 45,
      windowSeconds: 60,
      keyGenerator: (req) => {
        const userId = req.session?.userId;
        return userId ? `img:${userId}` : req.ip || req.socket.remoteAddress || "unknown";
      },
      message: "Too many image generations. Please wait a minute and try again."
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

// server/openrouter-image.ts
function openRouterFailureError(status, rawText) {
  let detail = rawText.slice(0, 700);
  try {
    const j = JSON.parse(rawText);
    if (j.error?.message) detail = j.error.message;
    else if (typeof j.message === "string") detail = j.message;
  } catch {
  }
  let message;
  if (status === 401) {
    message = `OpenRouter returned 401 Unauthorized \u2014 your API key is missing, invalid, or revoked. Check OPENROUTER_API_KEY matches a key from https://openrouter.ai/keys (must start with sk-or-v1-). OpenRouter: ${detail}`;
  } else if (status === 403) {
    message = `OpenRouter returned 403 Forbidden \u2014 key may lack permission or the model is blocked for your account. OpenRouter: ${detail}`;
  } else if (status === 402) {
    message = `OpenRouter returned 402 \u2014 add credits or a payment method at https://openrouter.ai/credits. OpenRouter: ${detail}`;
  } else if (status === 429) {
    message = `OpenRouter rate limit (429). Wait a minute and retry. OpenRouter: ${detail}`;
  } else if (status === 404) {
    message = `OpenRouter 404 \u2014 model may be wrong or renamed. Set OPENROUTER_IMAGE_MODEL to an image-capable model from https://openrouter.ai/models. OpenRouter: ${detail}`;
  } else {
    message = `OpenRouter error (${status}): ${detail}`;
  }
  const err = new Error(message);
  err.statusCode = status >= 400 && status < 600 ? status : 502;
  return err;
}
function extractUrlFromImageItem(item) {
  if (!item || typeof item !== "object") return void 0;
  const o = item;
  const nested = o.image_url?.url ?? o.imageUrl?.url;
  if (typeof nested === "string" && nested.length > 0) return nested;
  const direct = o.url;
  if (typeof direct === "string" && direct.startsWith("data:image")) return direct;
  return void 0;
}
function extractImageDataUrlFromMessage(message) {
  if (!message || typeof message !== "object") return void 0;
  const images = message.images;
  if (Array.isArray(images)) {
    for (const item of images) {
      const url = extractUrlFromImageItem(item);
      if (url) return url;
    }
  }
  const content = message.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      if (part.type === "image_url" || part.image_url || part.imageUrl) {
        const url = part.image_url?.url ?? part.imageUrl?.url;
        if (typeof url === "string" && url.length > 0) return url;
      }
    }
  }
  if (typeof content === "string" && content.startsWith("data:image")) {
    return content;
  }
  return void 0;
}
async function openRouterChatCompletion(body) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json"
  };
  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  if (referer) headers["HTTP-Referer"] = referer;
  headers["X-Title"] = process.env.OPENROUTER_APP_TITLE?.trim() || "EduContent Creator";
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const rawText = await res.text();
  if (!res.ok) {
    throw openRouterFailureError(res.status, rawText);
  }
  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }
}
async function generateImageWithOpenRouter(prompt) {
  const model = (process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim();
  const basePayload = {
    model,
    messages: [{ role: "user", content: prompt }]
  };
  const attempts = [
    { ...basePayload, modalities: ["image", "text"] },
    { ...basePayload, modalities: ["image"] }
  ];
  let lastError = "OpenRouter returned no image";
  for (let i = 0; i < attempts.length; i++) {
    const json = await openRouterChatCompletion(attempts[i]);
    const message = json.choices?.[0]?.message;
    const url = extractImageDataUrlFromMessage(message);
    if (url) return url;
    const preview = JSON.stringify(message ?? {}).slice(0, 400);
    console.error(
      `[openrouter-image] No image in response (attempt ${i + 1}/${attempts.length}). Message preview:`,
      preview
    );
    lastError = "OpenRouter returned no image \u2014 try OPENROUTER_IMAGE_MODEL with output_modalities including image, or check account credits.";
  }
  throw new Error(lastError);
}
var OPENROUTER_CHAT_URL, DEFAULT_IMAGE_MODEL;
var init_openrouter_image = __esm({
  "server/openrouter-image.ts"() {
    "use strict";
    OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
    DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";
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

// server/routes/ai.ts
function requireOpenRouterKey(res) {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    res.status(500).json({
      message: "OpenRouter API key is not configured. Set OPENROUTER_API_KEY for AI image generation (presentations and image tools)."
    });
    return false;
  }
  return true;
}
function requireOpenAIKey(res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ message: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables." });
    return false;
  }
  return true;
}
function registerAIRoutes({ app: app2, storage: storage2, requireAuth, requireTeacher }) {
  app2.post("/api/ai/generate", requireTeacher, aiGenerationRateLimit, withTimeoutMiddleware(25e3), asyncHandler(async (req, res) => {
    try {
      if (!requireOpenAIKey(res)) return;
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
          return res.status(400).json({ message: "Invalid content type" });
      }
      if (!res.headersSent) res.json(result);
    } catch (error) {
      console.error("AI generation error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      if (error.message?.includes("API key") || error.message?.includes("authentication")) {
        return res.status(401).json({ message: "OpenAI API authentication failed. Please check your OPENAI_API_KEY." });
      }
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({ message: "Request timeout - The AI generation took too long. Please try again with fewer items." });
      }
      if (error.message?.includes("rate limit")) {
        return res.status(429).json({ message: "Rate limit exceeded. Please wait a moment and try again." });
      }
      throw error;
    }
  }));
  app2.post("/api/ai/generate-interactive-video", requireTeacher, aiGenerationRateLimit, withTimeoutMiddleware(25e3), asyncHandler(async (req, res) => {
    try {
      if (!requireOpenAIKey(res)) return;
      const parsed = interactiveVideoGenerationSchema.parse(req.body);
      let enhancedMetadata = {
        videoTitle: parsed.videoTitle,
        videoDescription: parsed.videoDescription,
        videoDuration: parsed.videoDuration,
        videoTags: parsed.videoTags || [],
        channelTitle: parsed.channelTitle || ""
      };
      if (parsed.videoId && (!parsed.videoTags || parsed.videoTags.length === 0 || !parsed.channelTitle)) {
        try {
          const { getYouTubeClient: getYouTubeClient2 } = await Promise.resolve().then(() => (init_youtube(), youtube_exports));
          const youtube = getYouTubeClient2();
          const videoResponse = await youtube.videos.list({ part: ["snippet"], id: [parsed.videoId] });
          if (videoResponse.data.items && videoResponse.data.items.length > 0) {
            const video = videoResponse.data.items[0];
            enhancedMetadata = {
              videoTitle: video.snippet?.title || parsed.videoTitle,
              videoDescription: video.snippet?.description || parsed.videoDescription,
              videoDuration: parsed.videoDuration,
              videoTags: video.snippet?.tags || parsed.videoTags || [],
              channelTitle: video.snippet?.channelTitle || parsed.channelTitle || ""
            };
          }
        } catch {
        }
      }
      const request = {
        contentType: "interactive-video",
        topic: parsed.topic,
        difficulty: parsed.difficulty,
        numberOfItems: parsed.numberOfHotspots,
        gradeLevel: parsed.gradeLevel || "",
        additionalContext: parsed.additionalContext || "",
        language: "English"
      };
      const hotspots = await generateVideoHotspots(request, enhancedMetadata);
      if (!res.headersSent) res.json({ videoUrl: `https://www.youtube.com/watch?v=${parsed.videoId}`, hotspots });
    } catch (error) {
      console.error("Interactive video AI generation error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      if (error.message?.includes("API key") || error.message?.includes("authentication")) {
        return res.status(401).json({ message: "OpenAI API authentication failed. Please check your OPENAI_API_KEY." });
      }
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({ message: "Request timeout - The AI generation took too long. Please try again with fewer items." });
      }
      if (error.message?.includes("rate limit")) {
        return res.status(429).json({ message: "Rate limit exceeded. Please wait a moment and try again." });
      }
      throw error;
    }
  }));
  app2.post("/api/chat", requireAuth, asyncHandler(async (req, res) => {
    try {
      const parsed = chatRequestSchema.parse(req.body);
      const userId = req.session.userId;
      const user = await storage2.getProfileById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const history = await storage2.getChatHistory(userId, 10);
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
      if (parsed.context) {
        systemMessage += `

Current Context:
${JSON.stringify(parsed.context, null, 2)}`;
      }
      const messages2 = [
        { role: "system", content: systemMessage },
        ...recentMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: "user", content: parsed.message }
      ];
      await storage2.createChatMessage({ userId, role: "user", content: parsed.message, context: parsed.context || null });
      await new Promise((resolve, reject) => {
        req.session.save((err) => err ? reject(err) : resolve());
      });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const openai2 = getOpenAIClient();
      const stream = await openai2.chat.completions.create(
        { model: "gpt-4o", messages: messages2, stream: true, max_completion_tokens: 2048, temperature: 0.7 },
        { timeout: 6e4 }
      );
      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}

`);
        }
      }
      await storage2.createChatMessage({ userId, role: "assistant", content: fullResponse, context: null });
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (!res.headersSent) {
        if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
        throw error;
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}

`);
        res.end();
      }
    }
  }));
  app2.get("/api/chat/history", requireAuth, asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const history = await storage2.getChatHistory(req.session.userId, limit);
    res.json(history.reverse());
  }));
  app2.delete("/api/chat/history", requireAuth, asyncHandler(async (req, res) => {
    await storage2.deleteChatHistory(req.session.userId);
    res.json({ message: "Chat history cleared" });
  }));
  app2.post("/api/video-finder/generate-pedagogy", requireAuth, asyncHandler(async (req, res) => {
    try {
      const parsed = videoFinderPedagogySchema.parse(req.body);
      const result = await generateVideoFinderPedagogy(parsed);
      res.json(result);
    } catch (error) {
      console.error("Video Finder pedagogy generation error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
  app2.post("/api/presentation/generate", requireTeacher, presentationCreationRateLimit, withTimeoutMiddleware(55e3), asyncHandler(async (req, res) => {
    try {
      const parsed = presentationGenerationSchema.parse(req.body);
      const slides = await generatePresentation(parsed);
      if (!res.headersSent) res.json({ slides, generatedDate: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      console.error("Presentation generation error:", error);
      if (res.headersSent) return;
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        return res.status(504).json({ message: "Request timeout - Please try again with fewer slides." });
      }
      throw error;
    }
  }));
  app2.post("/api/unsplash/search", requireTeacher, imageSearchRateLimit, asyncHandler(async (req, res) => {
    try {
      const parsed = unsplashSearchSchema.parse(req.body);
      const { searchPhotos: searchPhotos2 } = await Promise.resolve().then(() => (init_unsplash(), unsplash_exports));
      const photos = await searchPhotos2(parsed.query, parsed.count);
      res.json({ photos });
    } catch (error) {
      console.error("Unsplash search error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
  app2.post("/api/ai/generate-image", requireTeacher, aiImageGenerationRateLimit, asyncHandler(async (req, res) => {
    try {
      const parsed = aiImageGenerationSchema.parse(req.body);
      if (!requireOpenRouterKey(res)) return;
      const imageUrl = await generateImageWithOpenRouter(parsed.prompt.trim());
      res.json({ imageUrl, prompt: parsed.prompt });
    } catch (error) {
      console.error("OpenRouter image generation error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
  app2.post("/api/youtube/search-simple", requireTeacher, asyncHandler(async (req, res) => {
    try {
      const parsed = youtubeSimpleSearchSchema.parse(req.body);
      const { searchEducationalVideos: searchEducationalVideos2 } = await Promise.resolve().then(() => (init_youtube(), youtube_exports));
      const results = await searchEducationalVideos2({
        subject: "",
        topic: parsed.query.trim(),
        learningOutcome: "",
        gradeLevel: "",
        ageRange: "",
        maxResults: parsed.maxResults
      });
      res.json({ results, searchDate: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      console.error("YouTube search error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
  app2.post("/api/youtube/search", requireTeacher, asyncHandler(async (req, res) => {
    try {
      const parsed = youtubeFullSearchSchema.parse(req.body);
      const { searchEducationalVideos: searchEducationalVideos2 } = await Promise.resolve().then(() => (init_youtube(), youtube_exports));
      const results = await searchEducationalVideos2({
        subject: parsed.subject,
        topic: parsed.topic,
        learningOutcome: parsed.learningOutcome,
        gradeLevel: parsed.gradeLevel,
        ageRange: parsed.ageRange || "",
        maxResults: parsed.videoCount
      });
      res.json({ results, searchDate: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      console.error("YouTube search error:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
}
var init_ai = __esm({
  "server/routes/ai.ts"() {
    "use strict";
    init_schema();
    init_openai();
    init_timeout();
    init_rate_limit();
    init_async_handler();
    init_openrouter_image();
  }
});

// server/services/audit-service.ts
import { eq as eq7, desc as desc5 } from "drizzle-orm";
var AuditService;
var init_audit_service = __esm({
  "server/services/audit-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    AuditService = class {
      async log(params) {
        const [entry] = await db.insert(auditLog).values({
          userId: params.userId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          metadata: params.metadata ?? null
        }).returning();
        return entry;
      }
      async getByEntity(entityType, entityId, limit = 50) {
        return db.select().from(auditLog).where(eq7(auditLog.entityId, entityId)).orderBy(desc5(auditLog.createdAt)).limit(limit);
      }
      async getByUser(userId, limit = 50) {
        return db.select().from(auditLog).where(eq7(auditLog.userId, userId)).orderBy(desc5(auditLog.createdAt)).limit(limit);
      }
      async getRecent(limit = 50) {
        return db.select().from(auditLog).orderBy(desc5(auditLog.createdAt)).limit(limit);
      }
    };
  }
});

// server/services/notification-service.ts
import { eq as eq8, and as and4, desc as desc6, count as count2 } from "drizzle-orm";
var NotificationService;
var init_notification_service = __esm({
  "server/services/notification-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    NotificationService = class {
      async create(userId, type, title, body, linkUrl) {
        const [notification] = await db.insert(notifications).values({ userId, type, title, body, linkUrl }).returning();
        return notification;
      }
      async getForUser(userId, limit = 50) {
        return db.select().from(notifications).where(eq8(notifications.userId, userId)).orderBy(desc6(notifications.createdAt)).limit(limit);
      }
      async getUnreadCount(userId) {
        const [result] = await db.select({ value: count2() }).from(notifications).where(
          and4(
            eq8(notifications.userId, userId),
            eq8(notifications.isRead, false)
          )
        );
        return result?.value ?? 0;
      }
      async markAsRead(notificationId, userId) {
        const [updated] = await db.update(notifications).set({ isRead: true }).where(
          and4(
            eq8(notifications.id, notificationId),
            eq8(notifications.userId, userId)
          )
        ).returning();
        return updated ?? null;
      }
      async markAllAsRead(userId) {
        await db.update(notifications).set({ isRead: true }).where(
          and4(
            eq8(notifications.userId, userId),
            eq8(notifications.isRead, false)
          )
        );
      }
      async createAssignmentNotification(studentIds, contentTitle, className, dueDate) {
        if (studentIds.length === 0) return;
        const duePart = dueDate ? ` Due ${dueDate.toLocaleDateString()}.` : "";
        const body = `New assignment "${contentTitle}" has been posted in ${className}.${duePart}`;
        const rows = studentIds.map((userId) => ({
          userId,
          type: "new_assignment",
          title: `New Assignment: ${contentTitle}`,
          body
        }));
        await db.insert(notifications).values(rows);
      }
      async createDueReminder(studentIds, contentTitle, className, dueDate) {
        if (studentIds.length === 0) return;
        const body = `"${contentTitle}" in ${className} is due ${dueDate.toLocaleDateString()}. Don't forget to submit!`;
        const rows = studentIds.map((userId) => ({
          userId,
          type: "due_reminder",
          title: `Due Soon: ${contentTitle}`,
          body
        }));
        await db.insert(notifications).values(rows);
      }
      async createGradeNotification(userId, contentTitle, score, total) {
        const percentage = total > 0 ? Math.round(score / total * 100) : 0;
        const body = `You scored ${score}/${total} (${percentage}%) on "${contentTitle}".`;
        return this.create(
          userId,
          "grade_posted",
          `Grade Posted: ${contentTitle}`,
          body
        );
      }
    };
  }
});

// server/routes/analytics.ts
function registerAnalyticsRoutes({ app: app2, storage: storage2, requireAuth, requireTeacher }) {
  const contentSvc = new ContentService(storage2);
  const auditSvc = new AuditService();
  const notifSvc = new NotificationService();
  const progressRateLimit = rateLimit({
    maxRequests: 30,
    windowSeconds: 60,
    keyGenerator: (req) => `progress-${req.session?.userId || req.ip}`
  });
  const quizAttemptRateLimit = rateLimit({
    maxRequests: 10,
    windowSeconds: 60,
    keyGenerator: (req) => `quiz-attempt-${req.session?.userId || req.ip}`
  });
  const interactionEventRateLimit = rateLimit({
    maxRequests: 60,
    windowSeconds: 60,
    keyGenerator: (req) => `interaction-event-${req.session?.userId || req.ip}`
  });
  app2.post("/api/progress", requireAuth, progressRateLimit, asyncHandler(async (req, res) => {
    try {
      const parsed = insertLearnerProgressSchema.parse({
        ...req.body,
        userId: req.session.userId,
        completedAt: req.body.completedAt ? new Date(req.body.completedAt) : req.body.completionPercentage >= 100 ? /* @__PURE__ */ new Date() : null,
        lastAccessedAt: /* @__PURE__ */ new Date()
      });
      const progress = await storage2.upsertLearnerProgress(parsed);
      res.json(progress);
    } catch (error) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
  app2.get("/api/progress/:contentId", requireAuth, asyncHandler(async (req, res) => {
    const progress = await storage2.getLearnerProgress(req.session.userId, req.params.contentId);
    res.json(progress || null);
  }));
  app2.get("/api/progress", requireAuth, asyncHandler(async (req, res) => {
    const progress = await storage2.getAllUserProgress(req.session.userId);
    res.json(progress);
  }));
  app2.post("/api/quiz-attempts", requireAuth, quizAttemptRateLimit, asyncHandler(async (req, res) => {
    try {
      const parsed = insertQuizAttemptSchema.parse({ ...req.body, userId: req.session.userId });
      const attempt = await storage2.createQuizAttempt(parsed);
      const content = await storage2.getContentById(parsed.contentId);
      const student = await storage2.getProfileById(req.session.userId);
      const pct = Math.round(parsed.score / parsed.totalQuestions * 100);
      auditSvc.log({
        userId: req.session.userId,
        action: "quiz_completed",
        entityType: "content",
        entityId: parsed.contentId,
        metadata: { score: parsed.score, total: parsed.totalQuestions, percentage: pct }
      });
      if (content && student) {
        notifyTeachers("quiz_completed", {
          studentName: student.fullName,
          contentTitle: content.title,
          contentId: content.id,
          score: parsed.score,
          total: parsed.totalQuestions,
          percentage: pct
        });
        notifSvc.createGradeNotification(
          req.session.userId,
          content.title,
          parsed.score,
          parsed.totalQuestions
        );
      }
      res.json(attempt);
    } catch (error) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
  app2.get("/api/quiz-attempts/:contentId", requireAuth, asyncHandler(async (req, res) => {
    const attempts = await storage2.getQuizAttempts(req.session.userId, req.params.contentId);
    res.json(attempts);
  }));
  app2.post("/api/interaction-events", requireAuth, interactionEventRateLimit, asyncHandler(async (req, res) => {
    try {
      const parsed = insertInteractionEventSchema.parse({ ...req.body, userId: req.session.userId });
      const event = await storage2.createInteractionEvent(parsed);
      res.json(event);
    } catch (error) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      throw error;
    }
  }));
  app2.get("/api/interaction-events/:contentId", requireAuth, asyncHandler(async (req, res) => {
    const events = await storage2.getInteractionEvents(req.session.userId, req.params.contentId);
    res.json(events);
  }));
  app2.get("/api/dashboard/recent-activity", requireAuth, asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const activity = await storage2.getRecentStudentActivity(req.session.userId, limit);
    res.json(activity);
  }));
  app2.get("/api/analytics/overview", requireAuth, asyncHandler(async (req, res) => {
    const analytics = await storage2.getUserContentAnalytics(req.session.userId);
    res.json(analytics);
  }));
  app2.get("/api/analytics/content/:contentId", requireAuth, asyncHandler(async (req, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage2.getContentAnalytics(req.params.contentId));
  }));
  app2.get("/api/analytics/content/:contentId/learners", requireAuth, asyncHandler(async (req, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage2.getContentLearners(req.params.contentId));
  }));
  app2.get("/api/analytics/content/:contentId/questions", requireAuth, asyncHandler(async (req, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage2.getQuestionAnalytics(req.params.contentId));
  }));
  app2.get("/api/analytics/content/:contentId/performance", requireAuth, asyncHandler(async (req, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage2.getStudentPerformanceDistribution(req.params.contentId));
  }));
  app2.get("/api/analytics/content/:contentId/score-distribution", requireAuth, asyncHandler(async (req, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    res.json(await storage2.getScoreDistribution(req.params.contentId));
  }));
  app2.get("/api/analytics/content/:contentId/export/csv", requireAuth, asyncHandler(async (req, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    const attempts = await storage2.getAllQuizAttemptsForContent(req.params.contentId);
    const userIds = Array.from(new Set(attempts.map((a) => a.userId)));
    const userProfiles = userIds.length > 0 ? await Promise.all(userIds.map((id) => storage2.getProfileById(id))) : [];
    const userMap = userProfiles.reduce(
      (acc, profile) => {
        if (profile) acc[profile.id] = profile;
        return acc;
      },
      {}
    );
    const headers = ["Student Name", "Email", "Score", "Total Questions", "Percentage", "Completed At"];
    const rows = attempts.map((attempt) => {
      const user = userMap[attempt.userId];
      return [
        user?.fullName || "Unknown",
        user?.email || "Unknown",
        attempt.score.toString(),
        attempt.totalQuestions.toString(),
        (attempt.score / attempt.totalQuestions * 100).toFixed(1),
        new Date(attempt.completedAt).toISOString()
      ];
    });
    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="quiz-results-${req.params.contentId}.csv"`);
    res.send(csv);
  }));
  app2.get("/api/gradebook/:classId", requireTeacher, asyncHandler(async (req, res) => {
    const classId = req.params.classId;
    const class_ = await storage2.getClassById(classId);
    if (!class_ || class_.userId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized to view this class" });
    }
    const [enrollments, assignments] = await Promise.all([
      storage2.getClassEnrollments(classId),
      storage2.getClassAssignments(classId)
    ]);
    const students = enrollments.filter((e) => e.role === "student");
    const assignmentData = await Promise.all(
      assignments.map(async (a) => {
        const allAttempts = await storage2.getAllQuizAttemptsForContent(a.contentId);
        const allProgress = await storage2.getUserProgressByContentId(a.contentId);
        return {
          contentId: a.contentId,
          contentTitle: a.contentTitle,
          contentType: a.contentType,
          dueDate: a.dueDate,
          attempts: allAttempts,
          progress: allProgress
        };
      })
    );
    const studentRows = students.map((student) => {
      const grades = {};
      let totalPercentage = 0;
      let gradedCount = 0;
      for (const assignment of assignmentData) {
        const studentAttempts = assignment.attempts.filter((a) => a.userId === student.userId);
        const studentProgress = assignment.progress.find((p) => p.userId === student.userId);
        if (studentAttempts.length > 0) {
          const best = studentAttempts.reduce(
            (b, a) => a.score / a.totalQuestions > b.score / b.totalQuestions ? a : b
          );
          const pct = Math.round(best.score / best.totalQuestions * 100);
          grades[assignment.contentId] = {
            bestScore: best.score,
            bestTotal: best.totalQuestions,
            bestPercentage: pct,
            attempts: studentAttempts.length,
            completionPercentage: studentProgress?.completionPercentage ?? 0,
            completedAt: studentProgress?.completedAt?.toISOString() ?? null
          };
          totalPercentage += pct;
          gradedCount++;
        } else {
          grades[assignment.contentId] = {
            bestScore: null,
            bestTotal: null,
            bestPercentage: null,
            attempts: 0,
            completionPercentage: studentProgress?.completionPercentage ?? 0,
            completedAt: studentProgress?.completedAt?.toISOString() ?? null
          };
        }
      }
      return {
        userId: student.userId,
        fullName: student.fullName,
        email: student.email,
        grades,
        averageScore: gradedCount > 0 ? Math.round(totalPercentage / gradedCount) : null,
        totalAttempted: gradedCount,
        totalAssignments: assignmentData.length
      };
    });
    const classAverage = studentRows.filter((s) => s.averageScore !== null).length > 0 ? Math.round(
      studentRows.filter((s) => s.averageScore !== null).reduce((sum2, s) => sum2 + s.averageScore, 0) / studentRows.filter((s) => s.averageScore !== null).length
    ) : null;
    res.json({
      classId,
      className: class_.name,
      classSubject: class_.subject,
      classGradeLevel: class_.gradeLevel,
      assignments: assignmentData.map((a) => ({
        contentId: a.contentId,
        contentTitle: a.contentTitle,
        contentType: a.contentType,
        dueDate: a.dueDate
      })),
      students: studentRows,
      classAverage,
      totalStudents: studentRows.length,
      totalAssignments: assignmentData.length
    });
  }));
  app2.get("/api/gradebook/:classId/export/csv", requireTeacher, asyncHandler(async (req, res) => {
    const classId = req.params.classId;
    const class_ = await storage2.getClassById(classId);
    if (!class_ || class_.userId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const [enrollments, assignments] = await Promise.all([
      storage2.getClassEnrollments(classId),
      storage2.getClassAssignments(classId)
    ]);
    const students = enrollments.filter((e) => e.role === "student");
    const assignmentData = await Promise.all(
      assignments.map(async (a) => {
        const attempts = await storage2.getAllQuizAttemptsForContent(a.contentId);
        return { contentId: a.contentId, contentTitle: a.contentTitle, attempts };
      })
    );
    const headers = [
      "Student Name",
      "Email",
      ...assignmentData.map((a) => a.contentTitle),
      "Average"
    ];
    const rows = students.map((student) => {
      const scores = [];
      let total = 0;
      let graded = 0;
      for (const assignment of assignmentData) {
        const studentAttempts = assignment.attempts.filter((a) => a.userId === student.userId);
        if (studentAttempts.length > 0) {
          const best = studentAttempts.reduce(
            (b, a) => a.score / a.totalQuestions > b.score / b.totalQuestions ? a : b
          );
          const pct = Math.round(best.score / best.totalQuestions * 100);
          scores.push(`${pct}%`);
          total += pct;
          graded++;
        } else {
          scores.push("\u2014");
        }
      }
      const avg2 = graded > 0 ? `${Math.round(total / graded)}%` : "\u2014";
      return [student.fullName, student.email, ...scores, avg2];
    });
    const csv = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="gradebook-${class_.name.replace(/[^a-zA-Z0-9]/g, "-")}.csv"`);
    res.send(csv);
  }));
  app2.get("/api/analytics/content/:contentId/export/json", requireAuth, asyncHandler(async (req, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    const content = check.data;
    const attempts = await storage2.getAllQuizAttemptsForContent(req.params.contentId);
    const userIds = Array.from(new Set(attempts.map((a) => a.userId)));
    const userProfiles = userIds.length > 0 ? await Promise.all(userIds.map((id) => storage2.getProfileById(id))) : [];
    const userMap = userProfiles.reduce(
      (acc, profile) => {
        if (profile) acc[profile.id] = profile;
        return acc;
      },
      {}
    );
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
  }));
  app2.get("/api/analytics/content/:contentId/interactions", requireAuth, asyncHandler(async (req, res) => {
    const check = await contentSvc.verifyOwnership(req.params.contentId, req.session.userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    const events = await storage2.getInteractionEvents("", req.params.contentId);
    const allProgress = await storage2.getUserProgressByContentId(req.params.contentId);
    const learners = await storage2.getContentLearners(req.params.contentId);
    const eventCounts = {};
    const summary = {
      totalLearners: learners.length,
      avgCompletion: learners.length > 0 ? Math.round(learners.reduce((s, l) => s + l.completionPercentage, 0) / learners.length) : 0,
      totalInteractions: learners.reduce((s, l) => s + l.totalInteractions, 0),
      completedCount: allProgress.filter((p) => p.completionPercentage >= 100).length,
      learners: learners.map((l) => ({
        name: l.displayName,
        email: l.email,
        completion: l.completionPercentage,
        interactions: l.totalInteractions,
        lastAccessed: l.lastAccessedAt
      }))
    };
    res.json(summary);
  }));
  app2.post("/api/gradebook/:classId/report/:studentId", requireTeacher, aiGenerationRateLimit, asyncHandler(async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "AI features are not configured." });
    }
    const { classId, studentId } = req.params;
    const class_ = await storage2.getClassById(classId);
    if (!class_ || class_.userId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const student = await storage2.getProfileById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });
    const assignments = await storage2.getClassAssignments(classId);
    const scoreData = [];
    for (const a of assignments) {
      const attempts = await storage2.getAllQuizAttemptsForContent(a.contentId);
      const studentAttempts = attempts.filter((att) => att.userId === studentId);
      const progress = await storage2.getLearnerProgress(studentId, a.contentId);
      if (studentAttempts.length > 0) {
        const best = studentAttempts.reduce(
          (b, att) => att.score / att.totalQuestions > b.score / b.totalQuestions ? att : b
        );
        const pct = Math.round(best.score / best.totalQuestions * 100);
        scoreData.push(`- "${a.contentTitle}" (${a.contentType}): ${pct}% (${best.score}/${best.totalQuestions}), ${studentAttempts.length} attempts`);
      } else if (progress) {
        scoreData.push(`- "${a.contentTitle}" (${a.contentType}): ${Math.round(progress.completionPercentage)}% completion, no quiz score`);
      } else {
        scoreData.push(`- "${a.contentTitle}" (${a.contentType}): Not started`);
      }
    }
    const prompt = `Generate a progress report for a student.

Student: ${student.fullName}
Class: ${class_.name}${class_.subject ? ` (${class_.subject})` : ""}${class_.gradeLevel ? `, ${class_.gradeLevel}` : ""}

Performance on assignments:
${scoreData.join("\n")}

Write a professional but warm progress report (3-4 paragraphs) that a teacher could send to parents. Include:
1. Overall assessment of the student's performance
2. Specific strengths based on high scores
3. Areas needing improvement based on low/missing scores
4. Actionable recommendations for the student and parent

Respond in JSON:
{
  "report": "The full report text in paragraphs"
}`;
    const result = await callOpenAIJSON(
      {
        systemMessage: "You are an experienced teacher writing student progress reports. Be professional, encouraging, and specific. Always respond with valid JSON.",
        prompt,
        maxTokens: 1024
      }
    );
    res.json({ report: result.report || "Unable to generate report." });
  }));
}
var init_analytics = __esm({
  "server/routes/analytics.ts"() {
    "use strict";
    init_schema();
    init_content_service();
    init_audit_service();
    init_notification_service();
    init_openai_helper();
    init_rate_limit();
    init_websocket();
    init_async_handler();
  }
});

// server/routes/classes.ts
import { eq as eq9, and as and5, desc as desc7 } from "drizzle-orm";
import { z as z2 } from "zod";
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
      } else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else current += char;
  }
  result.push(current);
  return result;
}
function registerClassRoutes({ app: app2, storage: storage2, requireAuth, requireTeacher }) {
  const authSvc = new AuthService(storage2);
  const notifSvc = new NotificationService();
  const auditSvc = new AuditService();
  app2.post("/api/classes", requireTeacher, asyncHandler(async (req, res) => {
    const { name, description, subject, gradeLevel } = createClassSchema.parse(req.body);
    const class_ = await storage2.createClass({
      name,
      description,
      subject,
      gradeLevel,
      userId: req.session.userId
    });
    res.json(class_);
  }));
  app2.get("/api/classes", requireTeacher, asyncHandler(async (req, res) => {
    const classes2 = await storage2.getClassesByUserId(req.session.userId);
    res.json(classes2);
  }));
  app2.get("/api/classes/:id", requireTeacher, asyncHandler(async (req, res) => {
    const class_ = await storage2.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to view this class" });
    res.json(class_);
  }));
  app2.put("/api/classes/:id", requireTeacher, asyncHandler(async (req, res) => {
    const class_ = await storage2.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to update this class" });
    const { name, description, subject, gradeLevel } = req.body;
    const updates = {};
    if (name !== void 0) updates.name = name.trim();
    if (description !== void 0) updates.description = description?.trim() || null;
    if (subject !== void 0) updates.subject = subject?.trim() || null;
    if (gradeLevel !== void 0) updates.gradeLevel = gradeLevel?.trim() || null;
    const updated = await storage2.updateClass(req.params.id, updates);
    res.json(updated);
  }));
  app2.delete("/api/classes/:id", requireTeacher, asyncHandler(async (req, res) => {
    const class_ = await storage2.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to delete this class" });
    await storage2.deleteClass(req.params.id);
    res.json({ message: "Class deleted successfully" });
  }));
  app2.get("/api/classes/:id/enrollments", requireTeacher, asyncHandler(async (req, res) => {
    const class_ = await storage2.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to view enrollments" });
    const enrollments = await storage2.getClassEnrollments(req.params.id);
    res.json(enrollments);
  }));
  app2.post("/api/classes/:id/enrollments", requireTeacher, asyncHandler(async (req, res) => {
    const class_ = await storage2.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to manage enrollments" });
    const { userId } = enrollStudentSchema.parse(req.body);
    try {
      const enrollment = await storage2.createClassEnrollment({ classId: req.params.id, userId });
      res.json(enrollment);
    } catch (error) {
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "User is already enrolled in this class" });
      }
      throw error;
    }
  }));
  app2.delete("/api/classes/:id/enrollments/:userId", requireTeacher, asyncHandler(async (req, res) => {
    const class_ = await storage2.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to manage enrollments" });
    await storage2.deleteClassEnrollment(req.params.id, req.params.userId);
    res.json({ message: "Enrollment removed successfully" });
  }));
  app2.post("/api/classes/:id/students", requireTeacher, asyncHandler(async (req, res) => {
    const { firstName, lastName, email } = createStudentSchema.parse({ ...req.body, classId: req.params.id });
    const class_ = await storage2.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to manage this class" });
    try {
      let user = await storage2.getProfileByEmail(email);
      let isNewUser = false;
      if (user) {
        if (user.role === "teacher" || user.role === "admin") {
          return res.status(400).json({ message: "This email belongs to a teacher account. Teachers cannot be enrolled as students." });
        }
        const enrollments = await storage2.getClassEnrollments(req.params.id);
        if (enrollments.some((e) => e.userId === user.id)) {
          return res.status(409).json({ message: "This student is already enrolled in the class" });
        }
      } else {
        user = await storage2.createProfile({
          email,
          fullName: `${firstName} ${lastName}`,
          password: null,
          role: "student",
          authProvider: "email"
        });
        isNewUser = true;
      }
      await storage2.createClassEnrollment({ classId: req.params.id, userId: user.id });
      let emailSent = false;
      if (isNewUser) {
        try {
          const crypto4 = await import("crypto");
          const resetToken = crypto4.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
          await storage2.setPasswordResetToken(user.email, resetToken, expiresAt);
          const { sendWelcomeEmail: sendWelcomeEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
          emailSent = await sendWelcomeEmail2(user.email, user.fullName, resetToken, class_.name);
        } catch {
        }
      }
      res.json({
        message: isNewUser ? emailSent ? "Student created and enrolled. Welcome email sent." : "Student created and enrolled. Email could not be sent - student should use 'Forgot Password' to set their password." : "Student enrolled successfully",
        student: { id: user.id, email: user.email, fullName: user.fullName },
        emailSent
      });
    } catch (error) {
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      throw error;
    }
  }));
  app2.get("/api/profile", requireAuth, asyncHandler(async (req, res) => {
    const profile = await storage2.getProfileById(req.session.userId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  }));
  app2.put("/api/profile", requireAuth, asyncHandler(async (req, res) => {
    const { fullName, institution } = req.body;
    if (fullName && typeof fullName === "string" && !fullName.trim()) {
      return res.status(400).json({ message: "Full name cannot be empty" });
    }
    const updates = {};
    if (fullName) updates.fullName = fullName.trim();
    if (institution !== void 0) updates.institution = institution?.trim() || null;
    updates.updatedAt = /* @__PURE__ */ new Date();
    const updated = await storage2.updateProfile(req.session.userId, updates);
    if (!updated) return res.status(404).json({ message: "Profile not found" });
    res.json(updated);
  }));
  app2.put("/api/profile/password", requireAuth, asyncHandler(async (req, res) => {
    const result = await authSvc.changePassword(req.session.userId, req.body.currentPassword, req.body.newPassword);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
  app2.get("/api/users/search", requireTeacher, asyncHandler(async (req, res) => {
    const { email, q } = req.query;
    if (!email && !q) return res.status(400).json({ message: "Email or search query is required" });
    const searchTerm = email || q;
    const user = await storage2.getProfileByEmail(searchTerm);
    if (user) {
      return res.json([{ id: user.id, email: user.email, fullName: user.fullName, role: user.role, institution: user.institution }]);
    }
    res.json([]);
  }));
  app2.get("/api/student/classes", requireAuth, asyncHandler(async (req, res) => {
    const studentClasses = await storage2.getStudentClasses(req.session.userId);
    res.json(studentClasses);
  }));
  app2.post("/api/content/:contentId/assignments", requireTeacher, asyncHandler(async (req, res) => {
    const content = await storage2.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to assign this content" });
    const { classId, dueDate, instructions } = assignContentSchema.parse(req.body);
    const class_ = await storage2.getClassById(classId);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to assign to this class" });
    let assignment;
    try {
      assignment = await storage2.createContentAssignment({
        contentId: req.params.contentId,
        classId,
        dueDate: dueDate ? new Date(dueDate) : null,
        instructions: instructions?.trim() || null
      });
    } catch (error) {
      if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
        return res.status(409).json({ message: "Content is already assigned to this class" });
      }
      throw error;
    }
    (async () => {
      try {
        const enrollments = await storage2.getClassEnrollments(classId);
        const students = enrollments.filter((e) => e.role === "student");
        const studentIds = students.map((e) => e.userId);
        if (studentIds.length > 0) {
          await notifSvc.createAssignmentNotification(
            studentIds,
            content.title,
            class_.name,
            dueDate ? new Date(dueDate) : null
          );
          studentIds.forEach((id) => {
            notifyUser(id, "new_assignment", {
              contentTitle: content.title,
              className: class_.name,
              contentId: req.params.contentId
            });
          });
        }
        auditSvc.log({
          userId: req.session.userId,
          action: "content_assigned",
          entityType: "assignment",
          entityId: assignment.id,
          metadata: { contentId: req.params.contentId, classId, studentCount: studentIds.length }
        });
        const studentEmails = students.map((e) => ({ email: e.email, fullName: e.fullName }));
        if (studentEmails.length > 0) {
          const { sendBulkAssignmentNotifications: sendBulkAssignmentNotifications2 } = await Promise.resolve().then(() => (init_email(), email_exports));
          await sendBulkAssignmentNotifications2(
            studentEmails,
            content.title,
            content.type,
            class_.name,
            req.params.contentId,
            dueDate ? new Date(dueDate) : null,
            instructions?.trim() || null
          );
        }
      } catch (notifError) {
        console.error("Failed to send assignment notifications:", notifError);
      }
    })();
    res.json(assignment);
  }));
  app2.get("/api/content/:contentId/assignments", requireTeacher, asyncHandler(async (req, res) => {
    const content = await storage2.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to view assignments" });
    const assignments = await storage2.getContentAssignments(req.params.contentId);
    res.json(assignments);
  }));
  app2.delete("/api/content/:contentId/assignments/:classId", requireTeacher, asyncHandler(async (req, res) => {
    const content = await storage2.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to manage assignments" });
    await storage2.deleteContentAssignment(req.params.contentId, req.params.classId);
    res.json({ message: "Assignment removed successfully" });
  }));
  app2.get("/api/classes/:id/assignments", requireTeacher, asyncHandler(async (req, res) => {
    const class_ = await storage2.getClassById(req.params.id);
    if (!class_) return res.status(404).json({ message: "Class not found" });
    if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to view assignments" });
    const assignments = await storage2.getClassAssignments(req.params.id);
    res.json(assignments);
  }));
  app2.get("/api/student/assignments", requireAuth, asyncHandler(async (req, res) => {
    const assignments = await storage2.getStudentAssignments(req.session.userId);
    res.json(assignments);
  }));
  app2.post("/api/classes/bulk-upload", requireTeacher, asyncHandler(async (req, res) => {
    const { csvData, classId } = req.body;
    if (!csvData || typeof csvData !== "string") return res.status(400).json({ message: "CSV data is required" });
    const lines = csvData.trim().split("\n");
    if (lines.length < 2) return res.status(400).json({ message: "CSV must have at least a header row and one data row" });
    const headers = parseCSVLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const emailIndex = headers.findIndex((h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address" || h.startsWith("student_email"));
    const firstNameIndex = headers.findIndex((h) => h === "firstname" || h === "first name" || h === "first_name");
    const lastNameIndex = headers.findIndex((h) => h === "lastname" || h === "last name" || h === "last_name");
    const nameIndex = headers.findIndex((h) => h === "name" || h === "full name" || h === "fullname");
    const errors = [];
    const targetClassId = classId;
    if (targetClassId && emailIndex === -1) {
      return res.status(400).json({ message: "CSV must have an 'email' column when enrolling in an existing class." });
    }
    if (targetClassId) {
      const class_ = await storage2.getClassById(targetClassId);
      if (!class_) return res.status(404).json({ message: "Class not found" });
      if (class_.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to manage this class" });
      const enrollments = [];
      await db.transaction(async (tx) => {
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]).map((v) => v.trim().replace(/^"|"$/g, ""));
          const email = values[emailIndex];
          if (!email) {
            errors.push(`Row ${i + 1}: Missing email`);
            continue;
          }
          let user = await storage2.getProfileByEmail(email);
          if (!user) {
            let fullName;
            const firstName = firstNameIndex !== -1 ? values[firstNameIndex]?.trim() : "";
            const lastName = lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : "";
            if (firstName || lastName) fullName = `${firstName} ${lastName}`.trim();
            else if (nameIndex !== -1 && values[nameIndex]) fullName = values[nameIndex];
            else fullName = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
            try {
              user = await storage2.createProfile({ email, fullName, password: null, role: "student", authProvider: "email" });
            } catch (e) {
              errors.push(`Row ${i + 1}: Failed to create user for email ${email}: ${e.message}`);
              continue;
            }
          }
          enrollments.push({ classId: targetClassId, userId: user.id });
        }
        if (enrollments.length > 0) await storage2.bulkCreateEnrollments(enrollments);
      });
      res.json({
        message: `Successfully enrolled ${enrollments.length} student(s)`,
        errors: errors.length > 0 ? errors : void 0
      });
    } else {
      const classHeaders = ["class_name", "name", "class name"];
      const classNameIndex = headers.findIndex((h) => classHeaders.includes(h));
      if (classNameIndex === -1) return res.status(400).json({ message: "CSV must have a 'class_name' or 'name' column for creating classes" });
      const classValues = parseCSVLine(lines[1]).map((v) => v.trim().replace(/^"|"$/g, ""));
      const className = classValues[classNameIndex];
      if (!className) return res.status(400).json({ message: "Missing class name in the first data row" });
      const descIndex = headers.findIndex((h) => h === "description" || h === "desc");
      const subjectIndex = headers.findIndex((h) => h === "subject");
      const gradeLevelIndex = headers.findIndex((h) => h === "grade_level" || h === "grade level" || h === "gradelevel");
      let class_;
      let enrolledCount = 0;
      await db.transaction(async (tx) => {
        class_ = await storage2.createClass({
          name: className,
          description: descIndex !== -1 ? classValues[descIndex] : null,
          subject: subjectIndex !== -1 ? classValues[subjectIndex] : null,
          gradeLevel: gradeLevelIndex !== -1 ? classValues[gradeLevelIndex] : null,
          userId: req.session.userId
        });
        let studentStartIndex = -1;
        let studentEmailIndex = -1;
        let studentFirstNameIndex = -1;
        let studentLastNameIndex = -1;
        let studentNameIndex = -1;
        for (let i = 2; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const potentialHeaders = parseCSVLine(line).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
          const hasEmailHeader = potentialHeaders.some((h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address");
          const hasNameHeader = potentialHeaders.some(
            (h) => h === "firstname" || h === "first name" || h === "first_name" || h === "lastname" || h === "last name" || h === "last_name" || h === "name" || h === "full name" || h === "fullname"
          );
          if (hasEmailHeader && hasNameHeader) {
            studentStartIndex = i + 1;
            studentEmailIndex = potentialHeaders.findIndex((h) => h === "email" || h === "e-mail" || h === "student_email" || h === "email address");
            studentFirstNameIndex = potentialHeaders.findIndex((h) => h === "firstname" || h === "first name" || h === "first_name");
            studentLastNameIndex = potentialHeaders.findIndex((h) => h === "lastname" || h === "last name" || h === "last_name");
            studentNameIndex = potentialHeaders.findIndex((h) => h === "name" || h === "full name" || h === "fullname");
            break;
          }
        }
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
            let user = await storage2.getProfileByEmail(email);
            if (!user) {
              let fullName;
              const firstName = studentFirstNameIndex !== -1 ? values[studentFirstNameIndex]?.trim() : "";
              const lastName = studentLastNameIndex !== -1 ? values[studentLastNameIndex]?.trim() : "";
              if (firstName || lastName) fullName = `${firstName} ${lastName}`.trim();
              else if (studentNameIndex !== -1 && values[studentNameIndex]) fullName = values[studentNameIndex];
              else fullName = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
              try {
                user = await storage2.createProfile({ email, fullName, password: null, role: "student", authProvider: "email" });
              } catch (e) {
                errors.push(`Row ${i + 1}: Failed to create user for ${email}: ${e.message}`);
                continue;
              }
            }
            try {
              await storage2.createClassEnrollment({ classId: class_.id, userId: user.id });
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
      });
      return res.json({
        message: `Successfully created class "${className}" with ${enrolledCount} student(s)`,
        classes: [class_],
        errors: errors.length > 0 ? errors : void 0
      });
    }
  }));
  app2.post("/api/content/:contentId/student-assignments", requireTeacher, asyncHandler(async (req, res) => {
    const content = await storage2.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized to assign this content" });
    const { studentIds, dueDate, instructions } = studentAssignmentSchema.parse(req.body);
    const { inserted, errors } = await db.transaction(async (tx) => {
      const inserted2 = [];
      const errors2 = [];
      for (const studentId of studentIds) {
        try {
          const [assignment] = await tx.insert(studentAssignments).values({
            contentId: req.params.contentId,
            studentId,
            assignedBy: req.session.userId,
            dueDate: dueDate ? new Date(dueDate) : null,
            instructions: instructions?.trim() || null
          }).returning();
          inserted2.push(assignment);
        } catch (error) {
          if (error.message?.includes("unique") || error.code === "23505") {
            errors2.push({ studentId, error: "Already assigned" });
          } else {
            throw error;
          }
        }
      }
      return { inserted: inserted2, errors: errors2 };
    });
    for (const assignment of inserted) {
      (async () => {
        try {
          const svc = new NotificationService();
          await svc.create(
            assignment.studentId,
            "new_assignment",
            "New Assignment",
            `You have been assigned "${content.title}"`,
            `/preview/${req.params.contentId}`
          );
          notifyUser(assignment.studentId, "new_assignment", {
            contentTitle: content.title,
            contentId: req.params.contentId
          });
        } catch (e) {
          console.error("Failed to send assignment notification:", e);
        }
      })();
    }
    res.json({ assigned: inserted.length, errors });
  }));
  app2.get("/api/content/:contentId/student-assignments", requireTeacher, asyncHandler(async (req, res) => {
    const content = await storage2.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized" });
    const assignments = await db.select({
      id: studentAssignments.id,
      studentId: studentAssignments.studentId,
      fullName: profiles.fullName,
      email: profiles.email,
      assignedAt: studentAssignments.assignedAt,
      dueDate: studentAssignments.dueDate,
      instructions: studentAssignments.instructions
    }).from(studentAssignments).innerJoin(profiles, eq9(studentAssignments.studentId, profiles.id)).where(eq9(studentAssignments.contentId, req.params.contentId)).orderBy(desc7(studentAssignments.assignedAt));
    res.json(assignments);
  }));
  app2.delete("/api/content/:contentId/student-assignments/:studentId", requireTeacher, asyncHandler(async (req, res) => {
    const content = await storage2.getContentById(req.params.contentId);
    if (!content) return res.status(404).json({ message: "Content not found" });
    if (content.userId !== req.session.userId) return res.status(403).json({ message: "Not authorized" });
    await db.delete(studentAssignments).where(and5(
      eq9(studentAssignments.contentId, req.params.contentId),
      eq9(studentAssignments.studentId, req.params.studentId)
    ));
    res.json({ message: "Student assignment removed" });
  }));
}
var createClassSchema, enrollStudentSchema, createStudentSchema, assignContentSchema, studentAssignmentSchema;
var init_classes = __esm({
  "server/routes/classes.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_async_handler();
    init_auth_service();
    init_notification_service();
    init_audit_service();
    init_websocket();
    createClassSchema = z2.object({
      name: z2.string().min(1, "Class name is required").transform((s) => s.trim()),
      description: z2.string().nullable().optional().transform((s) => s?.trim() || null),
      subject: z2.string().nullable().optional().transform((s) => s?.trim() || null),
      gradeLevel: z2.string().nullable().optional().transform((s) => s?.trim() || null)
    });
    enrollStudentSchema = z2.object({
      userId: z2.string().min(1, "User ID is required")
    });
    createStudentSchema = z2.object({
      firstName: z2.string().min(1, "First name is required").transform((s) => s.trim()),
      lastName: z2.string().min(1, "Last name is required").transform((s) => s.trim()),
      email: z2.string().email("Invalid email format").transform((s) => s.trim().toLowerCase()),
      classId: z2.string().min(1)
    });
    assignContentSchema = z2.object({
      classId: z2.string().min(1, "Class ID is required"),
      dueDate: z2.string().optional(),
      instructions: z2.string().optional().transform((s) => s?.trim() || void 0)
    });
    studentAssignmentSchema = z2.object({
      studentIds: z2.array(z2.string().min(1)).min(1, "At least one student ID is required"),
      dueDate: z2.string().optional(),
      instructions: z2.string().optional().transform((s) => s?.trim() || void 0)
    });
  }
});

// server/errors/presentation-errors.ts
var PresentationError, GoogleAuthError, TokenExpiredError, TokenRefreshError, InvalidImageUrlError, UntrustedImageDomainError, BatchSizeExceededError, SpeakerNotesError;
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
var SLIDE_WIDTH_EMU, SLIDE_HEIGHT_EMU, TITLE_SLIDE, CONTENT_SLIDE, IMAGE_CONTENT_SLIDE, OUTCOMES_SLIDE, VOCABULARY_SLIDE, COMPARISON_SLIDE, ACTIVITY_SLIDE, QUESTIONS_SLIDE, SUMMARY_SLIDE, CLOSING_SLIDE, FONT_FAMILY, FONT_FAMILY_TITLE, MAX_REQUESTS_PER_SLIDE, COLOR_THEMES, WHITE, DARK_TEXT, BODY_TEXT, TRUSTED_IMAGE_DOMAINS;
var init_slides = __esm({
  "server/constants/slides.ts"() {
    "use strict";
    SLIDE_WIDTH_EMU = 9144e3;
    SLIDE_HEIGHT_EMU = 5143500;
    TITLE_SLIDE = {
      accentBar: {
        x: 0,
        y: 0,
        width: SLIDE_WIDTH_EMU,
        height: 14e4
      },
      // Bottom accent strip for visual framing
      bottomBar: {
        x: 0,
        y: SLIDE_HEIGHT_EMU - 1e5,
        width: SLIDE_WIDTH_EMU,
        height: 1e5
      },
      title: {
        x: 572e3,
        y: 13e5,
        width: 8e6,
        height: 1e6,
        fontSize: 42
      },
      subtitle: {
        x: 572e3,
        y: 25e5,
        width: 8e6,
        height: 5e5,
        fontSize: 22
      },
      divider: {
        x: 572e3,
        y: 24e5,
        width: 2e6,
        height: 0,
        thickness: 32e3
      },
      // Metadata line: teacher name, institution, date, grade
      metadata: {
        x: 572e3,
        y: 32e5,
        width: 8e6,
        height: 35e4,
        fontSize: 13
      }
    };
    CONTENT_SLIDE = {
      accentBar: {
        x: 0,
        y: 0,
        width: 8e4,
        height: SLIDE_HEIGHT_EMU
      },
      title: {
        x: 572e3,
        y: 28e4,
        width: 8e6,
        height: 7e5,
        fontSize: 28
      },
      divider: {
        x: 572e3,
        y: 92e4,
        width: 8e6,
        height: 0,
        thickness: 14e3
      },
      body: {
        x: 572e3,
        y: 11e5,
        width: 8e6,
        height: 36e5,
        fontSize: 17,
        bulletFontSize: 16,
        lineSpacing: 155
      },
      // Slide number area (bottom-right)
      slideNumber: {
        x: 82e5,
        y: 49e5,
        width: 6e5,
        height: 2e5,
        fontSize: 10
      }
    };
    IMAGE_CONTENT_SLIDE = {
      accentBar: CONTENT_SLIDE.accentBar,
      title: CONTENT_SLIDE.title,
      divider: CONTENT_SLIDE.divider,
      body: {
        x: 572e3,
        y: 11e5,
        width: 44e5,
        height: 36e5,
        fontSize: 15,
        bulletFontSize: 14,
        lineSpacing: 145
      },
      image: {
        x: 52e5,
        y: 11e5,
        width: 35e5,
        height: 32e5
      },
      slideNumber: CONTENT_SLIDE.slideNumber
    };
    OUTCOMES_SLIDE = {
      accentBar: {
        x: 0,
        y: 0,
        width: SLIDE_WIDTH_EMU,
        height: 8e4
      },
      // Icon area (top-left, for emoji/icon)
      iconArea: {
        x: 572e3,
        y: 35e4,
        width: 6e5,
        height: 6e5,
        fontSize: 36
      },
      title: {
        x: 12e5,
        y: 38e4,
        width: 74e5,
        height: 6e5,
        fontSize: 28
      },
      divider: {
        x: 572e3,
        y: 1e6,
        width: 8e6,
        height: 0,
        thickness: 14e3
      },
      body: {
        x: 572e3,
        y: 12e5,
        width: 8e6,
        height: 35e5,
        fontSize: 18,
        bulletFontSize: 17,
        lineSpacing: 180
      },
      slideNumber: CONTENT_SLIDE.slideNumber
    };
    VOCABULARY_SLIDE = {
      accentBar: {
        x: 0,
        y: 0,
        width: SLIDE_WIDTH_EMU,
        height: 8e4
      },
      bgRect: {
        x: 35e4,
        y: 35e4,
        width: 8444e3,
        height: 4443500
      },
      title: {
        x: 6e5,
        y: 45e4,
        width: 7944e3,
        height: 6e5,
        fontSize: 26
      },
      // Vocabulary items area (two-column definition list)
      body: {
        x: 6e5,
        y: 115e4,
        width: 7944e3,
        height: 34e5,
        fontSize: 16,
        lineSpacing: 170
      },
      slideNumber: CONTENT_SLIDE.slideNumber
    };
    COMPARISON_SLIDE = {
      accentBar: CONTENT_SLIDE.accentBar,
      title: {
        x: 572e3,
        y: 28e4,
        width: 8e6,
        height: 6e5,
        fontSize: 26
      },
      divider: {
        x: 572e3,
        y: 85e4,
        width: 8e6,
        height: 0,
        thickness: 14e3
      },
      // Left column
      leftHeader: {
        x: 572e3,
        y: 105e4,
        width: 38e5,
        height: 4e5,
        fontSize: 20
      },
      leftBody: {
        x: 572e3,
        y: 15e5,
        width: 38e5,
        height: 32e5,
        fontSize: 15,
        bulletFontSize: 14,
        lineSpacing: 150
      },
      // Center divider
      centerLine: {
        x: 4572e3,
        y: 105e4,
        height: 365e4
      },
      // Right column
      rightHeader: {
        x: 48e5,
        y: 105e4,
        width: 38e5,
        height: 4e5,
        fontSize: 20
      },
      rightBody: {
        x: 48e5,
        y: 15e5,
        width: 38e5,
        height: 32e5,
        fontSize: 15,
        bulletFontSize: 14,
        lineSpacing: 150
      },
      slideNumber: CONTENT_SLIDE.slideNumber
    };
    ACTIVITY_SLIDE = {
      accentBar: {
        x: 0,
        y: 0,
        width: SLIDE_WIDTH_EMU,
        height: 8e4
      },
      bgRect: {
        x: 3e5,
        y: 3e5,
        width: 8544e3,
        height: 4543500
      },
      iconArea: {
        x: 6e5,
        y: 45e4,
        width: 5e5,
        height: 5e5,
        fontSize: 32
      },
      title: {
        x: 115e4,
        y: 48e4,
        width: 7444e3,
        height: 5e5,
        fontSize: 24
      },
      body: {
        x: 6e5,
        y: 11e5,
        width: 7944e3,
        height: 34e5,
        fontSize: 17,
        bulletFontSize: 16,
        lineSpacing: 170
      },
      slideNumber: CONTENT_SLIDE.slideNumber
    };
    QUESTIONS_SLIDE = {
      accentBar: {
        x: 0,
        y: 0,
        width: SLIDE_WIDTH_EMU,
        height: 8e4
      },
      bgRect: {
        x: 4e5,
        y: 4e5,
        width: 8344e3,
        height: 4343500,
        cornerRadius: 8e4
      },
      title: {
        x: 7e5,
        y: 55e4,
        width: 7744e3,
        height: 7e5,
        fontSize: 28
      },
      body: {
        x: 7e5,
        y: 135e4,
        width: 7744e3,
        height: 31e5,
        fontSize: 18,
        lineSpacing: 180
      },
      slideNumber: CONTENT_SLIDE.slideNumber
    };
    SUMMARY_SLIDE = {
      accentBar: {
        x: 0,
        y: 0,
        width: SLIDE_WIDTH_EMU,
        height: 12e4
      },
      title: {
        x: 572e3,
        y: 4e5,
        width: 8e6,
        height: 6e5,
        fontSize: 30
      },
      divider: {
        x: 572e3,
        y: 1e6,
        width: 3e6,
        height: 0,
        thickness: 2e4
      },
      body: {
        x: 572e3,
        y: 12e5,
        width: 8e6,
        height: 35e5,
        fontSize: 17,
        bulletFontSize: 16,
        lineSpacing: 165
      },
      slideNumber: CONTENT_SLIDE.slideNumber
    };
    CLOSING_SLIDE = {
      accentBar: {
        x: 0,
        y: 0,
        width: SLIDE_WIDTH_EMU,
        height: 14e4
      },
      bottomBar: {
        x: 0,
        y: SLIDE_HEIGHT_EMU - 1e5,
        width: SLIDE_WIDTH_EMU,
        height: 1e5
      },
      title: {
        x: 572e3,
        y: 15e5,
        width: 8e6,
        height: 8e5,
        fontSize: 38
      },
      subtitle: {
        x: 572e3,
        y: 25e5,
        width: 8e6,
        height: 5e5,
        fontSize: 20
      },
      divider: {
        x: 35e5,
        y: 24e5,
        width: 2144e3,
        height: 0,
        thickness: 28e3
      }
    };
    FONT_FAMILY = "Open Sans";
    FONT_FAMILY_TITLE = "Poppins";
    MAX_REQUESTS_PER_SLIDE = 20;
    COLOR_THEMES = {
      blue: {
        primary: { red: 0.16, green: 0.38, blue: 0.76 },
        secondary: { red: 0.09, green: 0.24, blue: 0.53 },
        accent: { red: 0.91, green: 0.94, blue: 0.99 },
        surface: { red: 0.96, green: 0.97, blue: 1 },
        onPrimary: { red: 1, green: 1, blue: 1 },
        muted: { red: 0.45, green: 0.5, blue: 0.58 }
      },
      green: {
        primary: { red: 0.1, green: 0.55, blue: 0.44 },
        secondary: { red: 0.06, green: 0.36, blue: 0.3 },
        accent: { red: 0.89, green: 0.97, blue: 0.94 },
        surface: { red: 0.95, green: 0.99, blue: 0.97 },
        onPrimary: { red: 1, green: 1, blue: 1 },
        muted: { red: 0.42, green: 0.53, blue: 0.5 }
      },
      purple: {
        primary: { red: 0.45, green: 0.24, blue: 0.66 },
        secondary: { red: 0.31, green: 0.14, blue: 0.49 },
        accent: { red: 0.95, green: 0.91, blue: 0.99 },
        surface: { red: 0.97, green: 0.95, blue: 1 },
        onPrimary: { red: 1, green: 1, blue: 1 },
        muted: { red: 0.52, green: 0.45, blue: 0.6 }
      },
      orange: {
        primary: { red: 0.85, green: 0.48, blue: 0.1 },
        secondary: { red: 0.62, green: 0.33, blue: 0.05 },
        accent: { red: 1, green: 0.95, blue: 0.88 },
        surface: { red: 1, green: 0.98, blue: 0.95 },
        onPrimary: { red: 1, green: 1, blue: 1 },
        muted: { red: 0.58, green: 0.5, blue: 0.42 }
      },
      teal: {
        primary: { red: 0.07, green: 0.55, blue: 0.6 },
        secondary: { red: 0.04, green: 0.38, blue: 0.42 },
        accent: { red: 0.88, green: 0.97, blue: 0.98 },
        surface: { red: 0.94, green: 0.99, blue: 0.99 },
        onPrimary: { red: 1, green: 1, blue: 1 },
        muted: { red: 0.4, green: 0.53, blue: 0.55 }
      },
      red: {
        primary: { red: 0.8, green: 0.2, blue: 0.18 },
        secondary: { red: 0.56, green: 0.12, blue: 0.1 },
        accent: { red: 0.99, green: 0.92, blue: 0.91 },
        surface: { red: 1, green: 0.96, blue: 0.96 },
        onPrimary: { red: 1, green: 1, blue: 1 },
        muted: { red: 0.58, green: 0.44, blue: 0.43 }
      }
    };
    WHITE = { red: 1, green: 1, blue: 1 };
    DARK_TEXT = { red: 0.15, green: 0.16, blue: 0.18 };
    BODY_TEXT = { red: 0.27, green: 0.29, blue: 0.33 };
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

// server/google-slides/helpers.ts
function shapeProps(pageId, x, y, w, h) {
  return {
    pageObjectId: pageId,
    size: {
      height: { magnitude: h, unit: "EMU" },
      width: { magnitude: w, unit: "EMU" }
    },
    transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: "EMU" }
  };
}
function solidFill(rgb, alpha = 1) {
  return { solidFill: { color: { rgbColor: rgb }, alpha } };
}
function textStyle(fontSize, rgb, opts = {}) {
  return {
    fontSize: { magnitude: fontSize, unit: "PT" },
    foregroundColor: { opaqueColor: { rgbColor: rgb } },
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    fontFamily: opts.fontFamily ?? FONT_FAMILY
  };
}
function fieldsFor(style) {
  const keys = [];
  if (style.fontSize) keys.push("fontSize");
  if (style.foregroundColor) keys.push("foregroundColor");
  if (style.bold !== void 0) keys.push("bold");
  if (style.italic !== void 0) keys.push("italic");
  if (style.fontFamily) keys.push("fontFamily");
  return keys.join(",");
}
function addRect(requests, id, pageId, x, y, w, h, fill, alpha = 1) {
  requests.push({
    createShape: {
      objectId: id,
      shapeType: "RECTANGLE",
      elementProperties: shapeProps(pageId, x, y, w, h)
    }
  });
  requests.push({
    updateShapeProperties: {
      objectId: id,
      shapeProperties: {
        shapeBackgroundFill: solidFill(fill, alpha),
        outline: { propertyState: "NOT_RENDERED" }
      },
      fields: "shapeBackgroundFill,outline"
    }
  });
}
function addTextBox(requests, id, pageId, layout, text2, style) {
  requests.push({
    createShape: {
      objectId: id,
      shapeType: "TEXT_BOX",
      elementProperties: shapeProps(pageId, layout.x, layout.y, layout.width, layout.height)
    }
  });
  requests.push({ insertText: { objectId: id, text: text2 } });
  requests.push({
    updateTextStyle: {
      objectId: id,
      style,
      fields: fieldsFor(style)
    }
  });
}
function addLine(requests, id, pageId, x, y, width, rgb, weight = 14e3) {
  requests.push({
    createLine: {
      objectId: id,
      lineCategory: "STRAIGHT",
      elementProperties: shapeProps(pageId, x, y, width, 0)
    }
  });
  requests.push({
    updateLineProperties: {
      objectId: id,
      lineProperties: {
        lineFill: { solidFill: { color: { rgbColor: rgb } } },
        weight: { magnitude: weight / 12700, unit: "PT" }
      },
      fields: "lineFill,weight"
    }
  });
}
var init_helpers = __esm({
  "server/google-slides/helpers.ts"() {
    "use strict";
    init_slides();
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
  const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.APP_URL || "http://localhost:5000";
  const oauth2Client = new google2.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/auth/google/callback`
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
function getBodyText(slide) {
  return slide.content || slide.text;
}
async function createPresentation(user, title) {
  const { auth } = await getOAuth2Client(user);
  const response = await slidesApi.presentations.create({
    auth,
    requestBody: { title }
  });
  const presentationId = response.data.presentationId;
  return {
    presentationId,
    url: `https://docs.google.com/presentation/d/${presentationId}/edit`
  };
}
async function makePubliclyViewable(auth, fileId) {
  try {
    await driveApi.permissions.create({
      auth,
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone"
      }
    });
  } catch (error) {
    console.warn("Could not set public sharing on presentation:", error);
  }
}
function validateSlideContent(slideContents) {
  slideContents.forEach((content, index2) => {
    let requestCount = 5;
    if (content.title) requestCount += 3;
    if (content.subtitle) requestCount += 3;
    if (content.text) requestCount += 3;
    if (content.bulletPoints?.length) requestCount += 3;
    if (content.questions?.length) requestCount += 5;
    if (content.imageUrl) requestCount += 1;
    if (content.notes) requestCount += 1;
    if (requestCount > MAX_REQUESTS_PER_SLIDE * 2) {
      throw new BatchSizeExceededError(index2, requestCount);
    }
  });
}
function validateSlideImages(slideContents, allowUntrusted = false) {
  return slideContents.map((slide, index2) => {
    if (!slide.imageUrl) return slide;
    try {
      const validatedUrl = validateImageUrl(slide.imageUrl, allowUntrusted);
      if (validatedUrl && !isPublicUrl(validatedUrl)) {
        console.warn(`Slide ${index2}: Image may not be publicly accessible: ${validatedUrl}`);
      }
      return { ...slide, imageUrl: validatedUrl };
    } catch {
      return { ...slide, imageUrl: void 0 };
    }
  });
}
function addSlideNumber(requests, index2, slideId, totalSlides, theme) {
  const L = CONTENT_SLIDE.slideNumber;
  addTextBox(
    requests,
    `slidenum_${index2}`,
    slideId,
    L,
    `${index2 + 1} / ${totalSlides}`,
    textStyle(L.fontSize, theme.muted)
  );
}
function buildTitleSlide(content, index2, theme) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const L = TITLE_SLIDE;
  requests.push({
    createSlide: {
      objectId: slideId,
      slideLayoutReference: { predefinedLayout: "BLANK" }
    }
  });
  requests.push({
    updatePageProperties: {
      objectId: slideId,
      pageProperties: { pageBackgroundFill: solidFill(theme.surface) },
      fields: "pageBackgroundFill"
    }
  });
  addRect(
    requests,
    `accent_${index2}`,
    slideId,
    L.accentBar.x,
    L.accentBar.y,
    L.accentBar.width,
    L.accentBar.height,
    theme.primary
  );
  addRect(
    requests,
    `bottom_${index2}`,
    slideId,
    L.bottomBar.x,
    L.bottomBar.y,
    L.bottomBar.width,
    L.bottomBar.height,
    theme.primary
  );
  if (content.title) {
    addTextBox(
      requests,
      `title_${index2}`,
      slideId,
      L.title,
      content.title,
      textStyle(L.title.fontSize, DARK_TEXT, { bold: true, fontFamily: FONT_FAMILY_TITLE })
    );
  }
  addLine(
    requests,
    `divider_${index2}`,
    slideId,
    L.divider.x,
    L.divider.y,
    L.divider.width,
    theme.primary,
    L.divider.thickness
  );
  const subtitleText = content.subtitle || getBodyText(content);
  if (subtitleText) {
    addTextBox(
      requests,
      `subtitle_${index2}`,
      slideId,
      L.subtitle,
      subtitleText,
      textStyle(L.subtitle.fontSize, theme.muted)
    );
  }
  const metaParts = [];
  if (content.teacherName) metaParts.push(content.teacherName);
  if (content.institution) metaParts.push(content.institution);
  if (content.subject) metaParts.push(content.subject);
  if (content.gradeLevel) metaParts.push(content.gradeLevel);
  if (content.date) metaParts.push(content.date);
  if (metaParts.length > 0) {
    addTextBox(
      requests,
      `meta_${index2}`,
      slideId,
      L.metadata,
      metaParts.join("  \u2022  "),
      textStyle(L.metadata.fontSize, theme.muted)
    );
  }
  return requests;
}
function buildContentSlide(content, index2, theme) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const hasImage = !!content.imageUrl;
  const L = hasImage ? IMAGE_CONTENT_SLIDE : CONTENT_SLIDE;
  requests.push({
    createSlide: {
      objectId: slideId,
      slideLayoutReference: { predefinedLayout: "BLANK" }
    }
  });
  requests.push({
    updatePageProperties: {
      objectId: slideId,
      pageProperties: { pageBackgroundFill: solidFill(WHITE) },
      fields: "pageBackgroundFill"
    }
  });
  addRect(
    requests,
    `accent_${index2}`,
    slideId,
    L.accentBar.x,
    L.accentBar.y,
    L.accentBar.width,
    L.accentBar.height,
    theme.primary
  );
  if (content.title) {
    addTextBox(
      requests,
      `title_${index2}`,
      slideId,
      L.title,
      content.title,
      textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
    );
    addLine(
      requests,
      `divider_${index2}`,
      slideId,
      L.divider.x,
      L.divider.y,
      L.divider.width,
      theme.accent,
      L.divider.thickness
    );
  }
  if (content.questions && content.questions.length > 0) {
    const qText = content.questions.map((q, i) => `${i + 1}.  ${q}`).join("\n\n");
    addTextBox(
      requests,
      `body_${index2}`,
      slideId,
      L.body,
      qText,
      textStyle(L.body.fontSize, BODY_TEXT)
    );
    requests.push({
      updateParagraphStyle: {
        objectId: `body_${index2}`,
        style: { lineSpacing: L.body.lineSpacing, spaceAbove: { magnitude: 6, unit: "PT" } },
        fields: "lineSpacing,spaceAbove"
      }
    });
    if (content.imageUrl && "image" in L) {
      const img = L.image;
      try {
        requests.push({
          createImage: {
            url: content.imageUrl,
            elementProperties: shapeProps(slideId, img.x, img.y, img.width, img.height)
          }
        });
      } catch (e) {
        console.warn("Skipped failed image insertion:", e.message);
      }
    }
    return requests;
  }
  const bodyText = getBodyText(content);
  const hasBullets = content.bulletPoints && content.bulletPoints.length > 0;
  if (bodyText && hasBullets) {
    const combinedText = bodyText + "\n" + content.bulletPoints.join("\n");
    const bulletStartIndex = bodyText.length + 1;
    addTextBox(
      requests,
      `body_${index2}`,
      slideId,
      L.body,
      combinedText,
      textStyle(L.body.fontSize, BODY_TEXT)
    );
    requests.push({
      createParagraphBullets: {
        objectId: `body_${index2}`,
        textRange: {
          startIndex: bulletStartIndex,
          endIndex: combinedText.length,
          type: "FIXED_RANGE"
        },
        bulletPreset: "BULLET_DISC_CIRCLE_SQUARE"
      }
    });
    requests.push({
      updateParagraphStyle: {
        objectId: `body_${index2}`,
        style: { lineSpacing: L.body.lineSpacing, spaceAbove: { magnitude: 4, unit: "PT" } },
        fields: "lineSpacing,spaceAbove"
      }
    });
  } else if (bodyText) {
    addTextBox(
      requests,
      `body_${index2}`,
      slideId,
      L.body,
      bodyText,
      textStyle(L.body.fontSize, BODY_TEXT)
    );
    requests.push({
      updateParagraphStyle: {
        objectId: `body_${index2}`,
        style: { lineSpacing: L.body.lineSpacing, spaceAbove: { magnitude: 6, unit: "PT" } },
        fields: "lineSpacing,spaceAbove"
      }
    });
  } else if (hasBullets) {
    const bulletText = content.bulletPoints.join("\n");
    addTextBox(
      requests,
      `body_${index2}`,
      slideId,
      L.body,
      bulletText,
      textStyle(L.body.bulletFontSize, BODY_TEXT)
    );
    requests.push({
      createParagraphBullets: {
        objectId: `body_${index2}`,
        bulletPreset: "BULLET_DISC_CIRCLE_SQUARE"
      }
    });
    requests.push({
      updateParagraphStyle: {
        objectId: `body_${index2}`,
        style: {
          lineSpacing: L.body.lineSpacing,
          spaceAbove: { magnitude: 4, unit: "PT" },
          spaceBelow: { magnitude: 4, unit: "PT" }
        },
        fields: "lineSpacing,spaceAbove,spaceBelow"
      }
    });
  }
  if (content.imageUrl && "image" in L) {
    const img = L.image;
    try {
      requests.push({
        createImage: {
          url: content.imageUrl,
          elementProperties: shapeProps(slideId, img.x, img.y, img.width, img.height)
        }
      });
    } catch (error) {
      console.error(`Failed to add image to slide ${index2}:`, error);
    }
  }
  return requests;
}
function buildQuestionsSlide(content, index2, theme) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const L = QUESTIONS_SLIDE;
  requests.push({
    createSlide: {
      objectId: slideId,
      slideLayoutReference: { predefinedLayout: "BLANK" }
    }
  });
  requests.push({
    updatePageProperties: {
      objectId: slideId,
      pageProperties: { pageBackgroundFill: solidFill(WHITE) },
      fields: "pageBackgroundFill"
    }
  });
  addRect(
    requests,
    `accent_${index2}`,
    slideId,
    L.accentBar.x,
    L.accentBar.y,
    L.accentBar.width,
    L.accentBar.height,
    theme.primary
  );
  addRect(
    requests,
    `bgrect_${index2}`,
    slideId,
    L.bgRect.x,
    L.bgRect.y,
    L.bgRect.width,
    L.bgRect.height,
    theme.accent
  );
  const titleText = content.title || (content.type === "guiding-questions" ? "Guiding Questions" : "Reflection");
  addTextBox(
    requests,
    `title_${index2}`,
    slideId,
    L.title,
    titleText,
    textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
  );
  let qBodyText = "";
  if (content.questions && content.questions.length > 0) {
    qBodyText = content.questions.map((q, i) => `${i + 1}.  ${q}`).join("\n\n");
  } else if (content.bulletPoints && content.bulletPoints.length > 0) {
    qBodyText = content.bulletPoints.map((q, i) => `${i + 1}.  ${q}`).join("\n\n");
  } else {
    qBodyText = getBodyText(content) || "";
  }
  if (qBodyText) {
    addTextBox(
      requests,
      `qbody_${index2}`,
      slideId,
      L.body,
      qBodyText,
      textStyle(L.body.fontSize, BODY_TEXT)
    );
    requests.push({
      updateParagraphStyle: {
        objectId: `qbody_${index2}`,
        style: {
          lineSpacing: L.body.lineSpacing,
          spaceAbove: { magnitude: 4, unit: "PT" }
        },
        fields: "lineSpacing,spaceAbove"
      }
    });
  }
  return requests;
}
function buildOutcomesSlide(content, index2, theme, totalSlides) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const L = OUTCOMES_SLIDE;
  requests.push({ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: "BLANK" } } });
  requests.push({ updatePageProperties: { objectId: slideId, pageProperties: { pageBackgroundFill: solidFill(WHITE) }, fields: "pageBackgroundFill" } });
  addRect(requests, `accent_${index2}`, slideId, L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height, theme.primary);
  if (content.emoji) {
    addTextBox(
      requests,
      `icon_${index2}`,
      slideId,
      L.iconArea,
      content.emoji,
      textStyle(L.iconArea.fontSize, DARK_TEXT)
    );
  }
  const titleText = content.title || "\u{1F3AF} Learning Outcomes";
  addTextBox(
    requests,
    `title_${index2}`,
    slideId,
    L.title,
    titleText,
    textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
  );
  addLine(requests, `divider_${index2}`, slideId, L.divider.x, L.divider.y, L.divider.width, theme.accent, L.divider.thickness);
  const bodyText = content.bulletPoints ? content.bulletPoints.map((p, i) => `${i + 1}.  ${p}`).join("\n\n") : getBodyText(content) || "";
  if (bodyText) {
    addTextBox(
      requests,
      `body_${index2}`,
      slideId,
      L.body,
      bodyText,
      textStyle(L.body.fontSize, BODY_TEXT)
    );
    requests.push({ updateParagraphStyle: { objectId: `body_${index2}`, style: { lineSpacing: L.body.lineSpacing, spaceAbove: { magnitude: 4, unit: "PT" } }, fields: "lineSpacing,spaceAbove" } });
  }
  addSlideNumber(requests, index2, slideId, totalSlides, theme);
  return requests;
}
function buildVocabularySlide(content, index2, theme, totalSlides) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const L = VOCABULARY_SLIDE;
  requests.push({ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: "BLANK" } } });
  requests.push({ updatePageProperties: { objectId: slideId, pageProperties: { pageBackgroundFill: solidFill(WHITE) }, fields: "pageBackgroundFill" } });
  addRect(requests, `accent_${index2}`, slideId, L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height, theme.primary);
  addRect(requests, `bgrect_${index2}`, slideId, L.bgRect.x, L.bgRect.y, L.bgRect.width, L.bgRect.height, theme.accent);
  const titleText = content.title || "\u{1F4DA} Key Vocabulary";
  addTextBox(
    requests,
    `title_${index2}`,
    slideId,
    L.title,
    titleText,
    textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
  );
  let bodyText = "";
  if (content.terms && content.terms.length > 0) {
    bodyText = content.terms.map((t) => `${t.term} \u2014 ${t.definition}`).join("\n\n");
  } else if (content.bulletPoints) {
    bodyText = content.bulletPoints.join("\n\n");
  } else {
    bodyText = getBodyText(content) || "";
  }
  if (bodyText) {
    addTextBox(
      requests,
      `body_${index2}`,
      slideId,
      L.body,
      bodyText,
      textStyle(L.body.fontSize, BODY_TEXT)
    );
    requests.push({ updateParagraphStyle: { objectId: `body_${index2}`, style: { lineSpacing: L.body.lineSpacing }, fields: "lineSpacing" } });
  }
  addSlideNumber(requests, index2, slideId, totalSlides, theme);
  return requests;
}
function buildComparisonSlide(content, index2, theme, totalSlides) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const L = COMPARISON_SLIDE;
  requests.push({ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: "BLANK" } } });
  requests.push({ updatePageProperties: { objectId: slideId, pageProperties: { pageBackgroundFill: solidFill(WHITE) }, fields: "pageBackgroundFill" } });
  addRect(requests, `accent_${index2}`, slideId, L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height, theme.primary);
  if (content.title) {
    addTextBox(
      requests,
      `title_${index2}`,
      slideId,
      L.title,
      content.title,
      textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
    );
    addLine(requests, `divider_${index2}`, slideId, L.divider.x, L.divider.y, L.divider.width, theme.accent, L.divider.thickness);
  }
  if (content.leftHeading) {
    addTextBox(
      requests,
      `lefthdr_${index2}`,
      slideId,
      L.leftHeader,
      content.leftHeading,
      textStyle(L.leftHeader.fontSize, theme.primary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
    );
  }
  if (content.leftPoints && content.leftPoints.length > 0) {
    const leftText = content.leftPoints.join("\n");
    addTextBox(
      requests,
      `lbody_${index2}`,
      slideId,
      L.leftBody,
      leftText,
      textStyle(L.leftBody.fontSize, BODY_TEXT)
    );
    requests.push({ createParagraphBullets: { objectId: `lbody_${index2}`, bulletPreset: "BULLET_DISC_CIRCLE_SQUARE" } });
  }
  requests.push({
    createLine: {
      objectId: `verdiv_${index2}`,
      lineCategory: "STRAIGHT",
      elementProperties: shapeProps(slideId, L.centerLine.x, L.centerLine.y, 0, L.centerLine.height)
    }
  });
  requests.push({
    updateLineProperties: {
      objectId: `verdiv_${index2}`,
      lineProperties: { lineFill: { solidFill: { color: { rgbColor: theme.accent } } }, weight: { magnitude: 1, unit: "PT" } },
      fields: "lineFill,weight"
    }
  });
  if (content.rightHeading) {
    addTextBox(
      requests,
      `righthdr_${index2}`,
      slideId,
      L.rightHeader,
      content.rightHeading,
      textStyle(L.rightHeader.fontSize, theme.primary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
    );
  }
  if (content.rightPoints && content.rightPoints.length > 0) {
    const rightText = content.rightPoints.join("\n");
    addTextBox(
      requests,
      `rbody_${index2}`,
      slideId,
      L.rightBody,
      rightText,
      textStyle(L.rightBody.fontSize, BODY_TEXT)
    );
    requests.push({ createParagraphBullets: { objectId: `rbody_${index2}`, bulletPreset: "BULLET_DISC_CIRCLE_SQUARE" } });
  }
  addSlideNumber(requests, index2, slideId, totalSlides, theme);
  return requests;
}
function buildActivitySlide(content, index2, theme, totalSlides) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const L = ACTIVITY_SLIDE;
  requests.push({ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: "BLANK" } } });
  requests.push({ updatePageProperties: { objectId: slideId, pageProperties: { pageBackgroundFill: solidFill(WHITE) }, fields: "pageBackgroundFill" } });
  addRect(requests, `accent_${index2}`, slideId, L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height, theme.primary);
  addRect(requests, `bgrect_${index2}`, slideId, L.bgRect.x, L.bgRect.y, L.bgRect.width, L.bgRect.height, theme.surface);
  const emoji = content.emoji || "\u270F\uFE0F";
  addTextBox(
    requests,
    `icon_${index2}`,
    slideId,
    L.iconArea,
    emoji,
    textStyle(L.iconArea.fontSize, DARK_TEXT)
  );
  const titleText = content.title || "Activity";
  addTextBox(
    requests,
    `title_${index2}`,
    slideId,
    L.title,
    titleText,
    textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
  );
  const bodyText = content.bulletPoints ? content.bulletPoints.join("\n") : getBodyText(content) || "";
  if (bodyText) {
    addTextBox(
      requests,
      `body_${index2}`,
      slideId,
      L.body,
      bodyText,
      textStyle(L.body.fontSize, BODY_TEXT)
    );
    if (content.bulletPoints) {
      requests.push({ createParagraphBullets: { objectId: `body_${index2}`, bulletPreset: "BULLET_ARROW_DIAMOND_DISC" } });
    }
    requests.push({ updateParagraphStyle: { objectId: `body_${index2}`, style: { lineSpacing: L.body.lineSpacing, spaceAbove: { magnitude: 4, unit: "PT" } }, fields: "lineSpacing,spaceAbove" } });
  }
  addSlideNumber(requests, index2, slideId, totalSlides, theme);
  return requests;
}
function buildSummarySlide(content, index2, theme, totalSlides) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const L = SUMMARY_SLIDE;
  requests.push({ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: "BLANK" } } });
  requests.push({ updatePageProperties: { objectId: slideId, pageProperties: { pageBackgroundFill: solidFill(theme.surface) }, fields: "pageBackgroundFill" } });
  addRect(requests, `accent_${index2}`, slideId, L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height, theme.primary);
  const titleText = content.title || "\u{1F4DD} Summary";
  addTextBox(
    requests,
    `title_${index2}`,
    slideId,
    L.title,
    titleText,
    textStyle(L.title.fontSize, theme.secondary, { bold: true, fontFamily: FONT_FAMILY_TITLE })
  );
  addLine(requests, `divider_${index2}`, slideId, L.divider.x, L.divider.y, L.divider.width, theme.primary, L.divider.thickness);
  const bodyText = content.bulletPoints ? content.bulletPoints.join("\n") : getBodyText(content) || "";
  if (bodyText) {
    addTextBox(
      requests,
      `body_${index2}`,
      slideId,
      L.body,
      bodyText,
      textStyle(L.body.fontSize, BODY_TEXT)
    );
    if (content.bulletPoints) {
      requests.push({ createParagraphBullets: { objectId: `body_${index2}`, bulletPreset: "BULLET_DIAMOND_DISC_SQUARE" } });
    }
    requests.push({ updateParagraphStyle: { objectId: `body_${index2}`, style: { lineSpacing: L.body.lineSpacing, spaceAbove: { magnitude: 4, unit: "PT" } }, fields: "lineSpacing,spaceAbove" } });
  }
  addSlideNumber(requests, index2, slideId, totalSlides, theme);
  return requests;
}
function buildClosingSlide(content, index2, theme) {
  const slideId = `slide_${index2}`;
  const requests = [];
  const L = CLOSING_SLIDE;
  requests.push({ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: "BLANK" } } });
  requests.push({ updatePageProperties: { objectId: slideId, pageProperties: { pageBackgroundFill: solidFill(theme.surface) }, fields: "pageBackgroundFill" } });
  addRect(requests, `accent_${index2}`, slideId, L.accentBar.x, L.accentBar.y, L.accentBar.width, L.accentBar.height, theme.primary);
  addRect(requests, `bottom_${index2}`, slideId, L.bottomBar.x, L.bottomBar.y, L.bottomBar.width, L.bottomBar.height, theme.primary);
  const titleText = content.title || "Thank You!";
  addTextBox(
    requests,
    `title_${index2}`,
    slideId,
    L.title,
    titleText,
    textStyle(L.title.fontSize, DARK_TEXT, { bold: true, fontFamily: FONT_FAMILY_TITLE })
  );
  addLine(requests, `divider_${index2}`, slideId, L.divider.x, L.divider.y, L.divider.width, theme.primary, L.divider.thickness);
  const subtitleText = content.subtitle || getBodyText(content) || "Questions? Let's discuss!";
  addTextBox(
    requests,
    `subtitle_${index2}`,
    slideId,
    L.subtitle,
    subtitleText,
    textStyle(L.subtitle.fontSize, theme.muted)
  );
  return requests;
}
function createSlideRequests(content, index2, colorTheme = "blue", totalSlides = 10) {
  const theme = COLOR_THEMES[colorTheme];
  const hasQuestions = content.questions && content.questions.length > 0;
  const isExplicitQuestionsType = content.type === "guiding-questions" || content.type === "reflection";
  if (isExplicitQuestionsType || hasQuestions && content.type !== "content" && content.type !== "image") {
    return buildQuestionsSlide(content, index2, theme);
  }
  switch (content.type) {
    case "title":
      return buildTitleSlide(content, index2, theme);
    case "learning-outcomes":
      return buildOutcomesSlide(content, index2, theme, totalSlides);
    case "vocabulary":
      return buildVocabularySlide(content, index2, theme, totalSlides);
    case "comparison":
      return buildComparisonSlide(content, index2, theme, totalSlides);
    case "activity":
      return buildActivitySlide(content, index2, theme, totalSlides);
    case "summary":
      return buildSummarySlide(content, index2, theme, totalSlides);
    case "closing":
      return buildClosingSlide(content, index2, theme);
    case "content":
    case "image":
    default:
      return buildContentSlide(content, index2, theme);
  }
}
async function addSlidesToPresentation(user, presentationId, slideContents, options = {}) {
  const { auth } = await getOAuth2Client(user);
  const warnings = [];
  const failedSlides = [];
  validateSlideContent(slideContents);
  const validatedSlides = validateSlideImages(slideContents, options.allowUntrustedImages);
  const presentation = await slidesApi.presentations.get({ auth, presentationId });
  const firstSlideId = presentation.data.slides?.[0]?.objectId;
  const allRequests = [];
  if (firstSlideId) {
    allRequests.push({ deleteObject: { objectId: firstSlideId } });
  }
  let successCount = 0;
  for (let index2 = 0; index2 < validatedSlides.length; index2++) {
    const content = validatedSlides[index2];
    try {
      const slideRequests = createSlideRequests(content, index2, options.colorTheme, validatedSlides.length);
      const requests = index2 === 0 && firstSlideId ? [{ deleteObject: { objectId: firstSlideId } }, ...slideRequests] : slideRequests;
      await slidesApi.presentations.batchUpdate({
        auth,
        presentationId,
        requestBody: { requests }
      });
      successCount++;
    } catch (error) {
      const apiErrors = error?.errors || error?.response?.data?.error?.details || [];
      const detail = apiErrors.length > 0 ? JSON.stringify(apiErrors[0]) : error?.response?.data?.error?.message || error?.message || "Unknown error";
      console.error(`Slide ${index2} failed:`, detail);
      console.error(`Slide ${index2} content type:`, content.type, "title:", content.title);
      failedSlides.push(index2);
      warnings.push(`Slide ${index2}: ${detail}`);
    }
  }
  if (firstSlideId && failedSlides.includes(0)) {
    try {
      await slidesApi.presentations.batchUpdate({
        auth,
        presentationId,
        requestBody: { requests: [{ deleteObject: { objectId: firstSlideId } }] }
      });
    } catch (e) {
      console.warn("Failed to delete default slide:", e.message);
    }
  }
  for (let i = 0; i < validatedSlides.length; i++) {
    if (validatedSlides[i].notes) {
      try {
        await addSpeakerNotes(auth, presentationId, `slide_${i}`, validatedSlides[i].notes);
      } catch {
        warnings.push(`Slide ${i}: Speaker notes could not be added`);
      }
    }
  }
  await makePubliclyViewable(auth, presentationId);
  return {
    successCount: validatedSlides.length - failedSlides.length,
    failedSlides,
    warnings
  };
}
async function addSpeakerNotes(auth, presentationId, slideId, notes) {
  try {
    const presentation = await slidesApi.presentations.get({ auth, presentationId });
    const slide = presentation.data.slides?.find((s) => s.objectId === slideId);
    if (!slide?.slideProperties?.notesPage) throw new Error("Notes page not found");
    const notesShape = slide.slideProperties.notesPage.pageElements?.find(
      (el) => el.shape?.placeholder?.type === "BODY"
    );
    if (!notesShape?.objectId) throw new Error("Notes shape not found");
    await slidesApi.presentations.batchUpdate({
      auth,
      presentationId,
      requestBody: {
        requests: [{ insertText: { objectId: notesShape.objectId, text: notes } }]
      }
    });
  } catch (error) {
    throw new SpeakerNotesError(parseInt(slideId.replace("slide_", "")));
  }
}
var slidesApi, driveApi;
var init_presentation = __esm({
  "server/presentation.ts"() {
    "use strict";
    init_token_manager();
    init_url_validator();
    init_presentation_errors();
    init_slides();
    init_helpers();
    slidesApi = google2.slides("v1");
    driveApi = google2.drive("v3");
  }
});

// server/routes/presentations.ts
function registerPresentationRoutes({ app: app2, storage: storage2, requireTeacher }) {
  app2.post("/api/presentation/create-presentation", requireTeacher, asyncHandler(async (req, res) => {
    const { title, slides, colorTheme } = req.body || {};
    if (!title || !slides || !Array.isArray(slides)) {
      return res.status(400).json({ message: "Missing required fields: title and slides" });
    }
    const user = await storage2.getProfileById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.googleAccessToken || !user.googleRefreshToken) {
      return res.status(403).json({
        message: "Please sign in with Google to create presentations in Google Slides."
      });
    }
    const { createPresentation: createPresentation2, addSlidesToPresentation: addSlidesToPresentation2 } = await Promise.resolve().then(() => (init_presentation(), presentation_exports));
    const { searchPhotos: searchPhotos2, getAltText: getAltText2, generateAttribution: generateAttribution2 } = await Promise.resolve().then(() => (init_unsplash(), unsplash_exports));
    const enrichedSlides = slides.map((slide) => {
      if (slide.type === "title") {
        return {
          ...slide,
          teacherName: slide.teacherName || user.fullName,
          institution: slide.institution || user.institution || void 0,
          date: slide.date || (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        };
      }
      return slide;
    });
    const slidesWithImages = await Promise.all(
      enrichedSlides.map(async (slide) => {
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
          } catch {
          }
        }
        return slide;
      })
    );
    try {
      const { presentationId, url } = await createPresentation2(user, title);
      const result = await addSlidesToPresentation2(user, presentationId, slidesWithImages, {
        colorTheme: colorTheme || "blue",
        allowUntrustedImages: false
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
      if (error.name === "GoogleAuthError" || error.name === "TokenExpiredError") {
        return res.status(403).json({ message: error.message || "Please reconnect your Google account." });
      }
      if (error.name === "BatchSizeExceededError") {
        return res.status(400).json({ message: error.message });
      }
      if (error.message?.includes("not connected their Google account")) {
        return res.status(403).json({ message: "Please sign in with Google to create presentations." });
      }
      throw error;
    }
  }));
}
var init_presentations = __esm({
  "server/routes/presentations.ts"() {
    "use strict";
    init_async_handler();
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

// server/routes/classroom.ts
function registerClassroomRoutes({ app: app2, storage: storage2, requireTeacher }) {
  app2.get("/api/google-classroom/courses", requireTeacher, asyncHandler(async (req, res) => {
    const user = await storage2.getProfileById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.googleAccessToken) {
      return res.status(403).json({ message: "Please sign in with Google to access Google Classroom." });
    }
    const { listTeacherCourses: listTeacherCourses2 } = await Promise.resolve().then(() => (init_google_classroom(), google_classroom_exports));
    const courses = await listTeacherCourses2(user);
    res.json({ courses });
  }));
  app2.post("/api/google-classroom/share", requireTeacher, asyncHandler(async (req, res) => {
    const { courseId, title, description, materialLink, dueDate, dueTime } = req.body;
    if (!courseId || !title || !materialLink) {
      return res.status(400).json({ message: "Missing required fields: courseId, title, materialLink" });
    }
    const user = await storage2.getProfileById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.googleAccessToken) {
      return res.status(403).json({ message: "Please sign in with Google to share to Google Classroom" });
    }
    const { shareToClassroom: shareToClassroom2 } = await Promise.resolve().then(() => (init_google_classroom(), google_classroom_exports));
    const coursework = await shareToClassroom2(user, courseId, title, description || "", materialLink, dueDate, dueTime);
    res.json({ coursework, message: "Successfully shared to Google Classroom!" });
  }));
  app2.post("/api/google-classroom/announce", requireTeacher, asyncHandler(async (req, res) => {
    const { courseId, text: text2, materialLink, materialTitle } = req.body;
    if (!courseId || !text2) {
      return res.status(400).json({ message: "Missing required fields: courseId, text" });
    }
    const user = await storage2.getProfileById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.googleAccessToken) {
      return res.status(403).json({ message: "Please sign in with Google to post to Google Classroom" });
    }
    const { postAnnouncement: postAnnouncement2 } = await Promise.resolve().then(() => (init_google_classroom(), google_classroom_exports));
    const announcement = await postAnnouncement2(user, courseId, text2, materialLink, materialTitle);
    res.json({ announcement, message: "Successfully posted announcement to Google Classroom!" });
  }));
}
var init_classroom = __esm({
  "server/routes/classroom.ts"() {
    "use strict";
    init_async_handler();
  }
});

// server/routes/student.ts
import { z as z3 } from "zod";
import { eq as eq10, desc as desc8, and as and6, inArray as inArray4 } from "drizzle-orm";
function registerStudentRoutes({ app: app2, storage: storage2, requireAuth }) {
  app2.get("/api/student/my-assignments", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const classAssignments = await storage2.getStudentAssignments(userId);
    const individualAssignments = await db.select({
      assignmentId: studentAssignments.id,
      contentId: h5pContent.id,
      contentTitle: h5pContent.title,
      contentType: h5pContent.type,
      assignedAt: studentAssignments.assignedAt,
      dueDate: studentAssignments.dueDate,
      instructions: studentAssignments.instructions
    }).from(studentAssignments).innerJoin(h5pContent, eq10(studentAssignments.contentId, h5pContent.id)).where(eq10(studentAssignments.studentId, userId)).orderBy(desc8(studentAssignments.assignedAt));
    const seenContentIds = new Set(classAssignments.map((a) => a.contentId));
    const merged = [
      ...classAssignments,
      ...individualAssignments.filter((a) => !seenContentIds.has(a.contentId)).map((a) => ({ ...a, classId: null, className: "Individual Assignment" }))
    ];
    const contentIds = merged.map((a) => a.contentId);
    const allProgress = contentIds.length > 0 ? await db.select().from(learnerProgress).where(and6(eq10(learnerProgress.userId, userId), inArray4(learnerProgress.contentId, contentIds))) : [];
    const progressMap = new Map(allProgress.map((p) => [p.contentId, p]));
    const enriched = merged.map((a) => {
      const progress = progressMap.get(a.contentId);
      return {
        ...a,
        completionPercentage: progress?.completionPercentage ?? 0,
        completedAt: progress?.completedAt ?? null,
        lastAccessedAt: progress?.lastAccessedAt ?? null
      };
    });
    res.json(enriched);
  }));
  app2.get("/api/student/my-scores", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const assignments = await storage2.getStudentAssignments(userId);
    const contentIds = Array.from(new Set(assignments.map((a) => a.contentId)));
    const allAttempts = contentIds.length > 0 ? await db.select().from(quizAttempts).where(and6(eq10(quizAttempts.userId, userId), inArray4(quizAttempts.contentId, contentIds))) : [];
    const attemptsByContent = /* @__PURE__ */ new Map();
    for (const a of allAttempts) {
      const list = attemptsByContent.get(a.contentId) || [];
      list.push(a);
      attemptsByContent.set(a.contentId, list);
    }
    const scores = [];
    for (const contentId of contentIds) {
      const attempts = attemptsByContent.get(contentId) || [];
      if (attempts.length > 0) {
        const assignment = assignments.find((a) => a.contentId === contentId);
        const bestAttempt = attempts.reduce(
          (best, a) => a.score / a.totalQuestions > best.score / best.totalQuestions ? a : best
        );
        scores.push({
          contentId,
          contentTitle: assignment?.contentTitle ?? "Unknown",
          contentType: assignment?.contentType ?? "quiz",
          className: assignment?.className ?? "Unknown",
          attempts: attempts.length,
          bestScore: bestAttempt.score,
          bestTotal: bestAttempt.totalQuestions,
          bestPercentage: Math.round(bestAttempt.score / bestAttempt.totalQuestions * 100),
          latestAttemptDate: attempts[0].completedAt
        });
      }
    }
    res.json(scores);
  }));
  app2.get("/api/student/my-progress", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const allProgress = await storage2.getAllUserProgress(userId);
    const assignments = await storage2.getStudentAssignments(userId);
    const classes2 = await storage2.getStudentClasses(userId);
    const totalAssignments = assignments.length;
    const completedAssignments = allProgress.filter((p) => p.completionPercentage >= 100).length;
    const avgCompletion = allProgress.length > 0 ? Math.round(allProgress.reduce((sum2, p) => sum2 + p.completionPercentage, 0) / allProgress.length) : 0;
    const progressDetails = assignments.map((a) => {
      const p = allProgress.find((pr) => pr.contentId === a.contentId);
      return {
        contentId: a.contentId,
        contentTitle: a.contentTitle,
        contentType: a.contentType,
        className: a.className,
        dueDate: a.dueDate,
        completionPercentage: p?.completionPercentage ?? 0,
        completedAt: p?.completedAt ?? null,
        lastAccessedAt: p?.lastAccessedAt ?? null
      };
    });
    res.json({
      summary: {
        totalClasses: classes2.length,
        totalAssignments,
        completedAssignments,
        avgCompletion,
        inProgressAssignments: totalAssignments - completedAssignments
      },
      progress: progressDetails
    });
  }));
  app2.get("/api/student/gradebook", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const classes2 = await storage2.getStudentClasses(userId);
    if (classes2.length === 0) return res.json({ classes: [], overall: null });
    const [classAssignments, individualRows] = await Promise.all([
      storage2.getStudentAssignments(userId),
      db.select({
        contentId: h5pContent.id,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        assignedAt: studentAssignments.assignedAt,
        dueDate: studentAssignments.dueDate
      }).from(studentAssignments).innerJoin(h5pContent, eq10(studentAssignments.contentId, h5pContent.id)).where(eq10(studentAssignments.studentId, userId))
    ]);
    const allContentIds = Array.from(/* @__PURE__ */ new Set([
      ...classAssignments.map((a) => a.contentId),
      ...individualRows.map((a) => a.contentId)
    ]));
    const [allAttempts, allProgress] = await Promise.all([
      allContentIds.length > 0 ? db.select().from(quizAttempts).where(and6(eq10(quizAttempts.userId, userId), inArray4(quizAttempts.contentId, allContentIds))) : Promise.resolve([]),
      allContentIds.length > 0 ? db.select().from(learnerProgress).where(and6(eq10(learnerProgress.userId, userId), inArray4(learnerProgress.contentId, allContentIds))) : Promise.resolve([])
    ]);
    const attemptsByContent = /* @__PURE__ */ new Map();
    for (const a of allAttempts) {
      const list = attemptsByContent.get(a.contentId) || [];
      list.push(a);
      attemptsByContent.set(a.contentId, list);
    }
    const progressByContent = new Map(allProgress.map((p) => [p.contentId, p]));
    function gradeForContent(contentId) {
      const attempts = attemptsByContent.get(contentId) || [];
      const progress = progressByContent.get(contentId);
      if (attempts.length > 0) {
        const best = attempts.reduce(
          (b, a) => a.score / a.totalQuestions > b.score / b.totalQuestions ? a : b
        );
        return {
          bestScore: best.score,
          bestTotal: best.totalQuestions,
          bestPercentage: Math.round(best.score / best.totalQuestions * 100),
          attempts: attempts.length,
          completionPercentage: progress?.completionPercentage ?? 0,
          completedAt: progress?.completedAt?.toISOString() ?? null
        };
      }
      return {
        bestScore: null,
        bestTotal: null,
        bestPercentage: null,
        attempts: 0,
        completionPercentage: progress?.completionPercentage ?? 0,
        completedAt: progress?.completedAt?.toISOString() ?? null
      };
    }
    const classData = classes2.map((c) => {
      const assignments = classAssignments.filter((a) => a.classId === c.id);
      const grades = assignments.map((a) => ({
        contentId: a.contentId,
        contentTitle: a.contentTitle,
        contentType: a.contentType,
        dueDate: a.dueDate,
        ...gradeForContent(a.contentId)
      }));
      const gradedItems = grades.filter((g) => g.bestPercentage !== null);
      const classAverage = gradedItems.length > 0 ? Math.round(gradedItems.reduce((sum2, g) => sum2 + g.bestPercentage, 0) / gradedItems.length) : null;
      return {
        classId: c.id,
        className: c.name,
        subject: c.subject,
        gradeLevel: c.gradeLevel,
        assignments: grades,
        classAverage,
        totalAssignments: assignments.length,
        completedAssignments: grades.filter((g) => g.completionPercentage >= 100).length
      };
    });
    const seenInClass = new Set(classAssignments.map((a) => a.contentId));
    const individualGrades = individualRows.filter((a) => !seenInClass.has(a.contentId)).map((a) => ({
      contentId: a.contentId,
      contentTitle: a.contentTitle,
      contentType: a.contentType,
      dueDate: a.dueDate,
      ...gradeForContent(a.contentId)
    }));
    const allGrades = [...classData.flatMap((c) => c.assignments), ...individualGrades];
    const allGraded = allGrades.filter((g) => g.bestPercentage !== null);
    const overallAverage = allGraded.length > 0 ? Math.round(allGraded.reduce((sum2, g) => sum2 + g.bestPercentage, 0) / allGraded.length) : null;
    res.json({
      classes: classData,
      individualAssignments: individualGrades,
      overall: {
        average: overallAverage,
        totalAssignments: allGrades.length,
        totalGraded: allGraded.length,
        totalCompleted: allGrades.filter((g) => g.completionPercentage >= 100).length
      }
    });
  }));
  const insightsSchema = z3.object({
    score: z3.number(),
    totalQuestions: z3.number().min(1),
    percentage: z3.number(),
    totalIncorrect: z3.number(),
    incorrectQuestions: z3.array(z3.object({
      question: z3.string(),
      type: z3.string(),
      studentAnswer: z3.any(),
      correctAnswer: z3.any(),
      options: z3.array(z3.string()).optional().nullable(),
      isCorrect: z3.boolean(),
      explanation: z3.string().optional().nullable()
    }))
  });
  app2.post("/api/student/ai-insights", requireAuth, studentAIRateLimit, asyncHandler(async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "AI features are not configured." });
    }
    const parsed = insightsSchema.parse(req.body);
    const incorrectSummary = parsed.incorrectQuestions.map((q, i) => {
      const studentAns = typeof q.studentAnswer === "number" && q.options ? q.options[q.studentAnswer] : String(q.studentAnswer ?? "no answer");
      const correctAns = typeof q.correctAnswer === "number" && q.options ? q.options[q.correctAnswer] : String(q.correctAnswer);
      return `${i + 1}. "${q.question}" (${q.type}) \u2014 Student answered: "${studentAns}", Correct: "${correctAns}"${q.explanation ? ` \u2014 Explanation: ${q.explanation}` : ""}`;
    }).join("\n");
    const prompt = `A student just completed a quiz and scored ${parsed.score}/${parsed.totalQuestions} (${parsed.percentage}%).

${parsed.totalIncorrect > 0 ? `They got these questions wrong:
${incorrectSummary}` : "They got every question correct!"}

Generate encouraging, student-friendly study insights. The student should feel motivated, not discouraged.

Respond in JSON:
{
  "overallFeedback": "2-3 sentences of encouraging feedback about their performance",
  "strengths": ["1-2 things they did well based on their score"],
  "areasToImprove": ["1-3 specific concepts to review based on wrong answers, if any"],
  "questionInsights": [
    {
      "questionId": "q1",
      "insight": "Brief, helpful explanation of why the correct answer is right \u2014 written for a student, 1-2 sentences max"
    }
  ],
  "studyTips": ["2-3 actionable study tips related to the topics they struggled with"]
}

Rules:
- Be warm and encouraging \u2014 use language appropriate for a school student
- If they scored 100%, celebrate and give advanced study suggestions
- questionInsights should only cover wrong answers \u2014 skip correct ones
- Keep each insight concise (1-2 sentences)
- Focus on understanding concepts, not memorizing answers`;
    const result = await callOpenAIJSON(
      {
        systemMessage: "You are a friendly, encouraging tutor helping a student understand their quiz results. Always respond with valid JSON.",
        prompt,
        maxTokens: 2048
      }
    );
    res.json({
      overallFeedback: result.overallFeedback || "",
      strengths: result.strengths || [],
      areasToImprove: result.areasToImprove || [],
      questionInsights: result.questionInsights || [],
      studyTips: result.studyTips || []
    });
  }));
  const questionInsightSchema = z3.object({
    question: z3.string().min(1),
    type: z3.string(),
    studentAnswer: z3.any(),
    correctAnswer: z3.any(),
    options: z3.array(z3.string()).optional().nullable(),
    isCorrect: z3.boolean(),
    explanation: z3.string().optional().nullable()
  });
  app2.post("/api/student/ai-question-insight", requireAuth, studentAIRateLimit, asyncHandler(async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "AI features are not configured." });
    }
    const q = questionInsightSchema.parse(req.body);
    const studentAns = typeof q.studentAnswer === "number" && q.options ? q.options[q.studentAnswer] : String(q.studentAnswer ?? "no answer");
    const correctAns = typeof q.correctAnswer === "number" && q.options ? q.options[q.correctAnswer] : String(q.correctAnswer);
    const prompt = `A student answered a ${q.type} question.

Question: "${q.question}"
Student's answer: "${studentAns}"
Correct answer: "${correctAns}"
${q.isCorrect ? "The student got it RIGHT." : "The student got it WRONG."}
${q.explanation ? `Teacher's explanation: ${q.explanation}` : ""}

${q.isCorrect ? "Give a brief congratulatory note (1 sentence) and then explain WHY this answer is correct and what concept it demonstrates (2-3 sentences). Help the student deepen their understanding." : "Explain WHY the correct answer is right in a way a student can understand (2-3 sentences). Then give a short, practical tip for remembering this concept (1 sentence). Be encouraging, not critical."}

Respond in JSON:
{
  "insight": "Your explanation here \u2014 3-4 sentences total, written for a student"
}`;
    const result = await callOpenAIJSON(
      {
        systemMessage: "You are a friendly tutor explaining a quiz question to a student. Be clear, encouraging, and concise. Always respond with valid JSON.",
        prompt,
        maxTokens: 512
      }
    );
    res.json({ insight: result.insight || "No insight available." });
  }));
}
var studentAIRateLimit;
var init_student = __esm({
  "server/routes/student.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_openai_helper();
    init_rate_limit();
    init_async_handler();
    studentAIRateLimit = rateLimit({
      maxRequests: 20,
      windowSeconds: 3600,
      // 20 AI calls per hour per student
      keyGenerator: (req) => `student-ai-${req.session?.userId || req.ip}`,
      message: "You've used all your AI insights for now. Try again in an hour."
    });
  }
});

// server/routes/notifications.ts
function registerNotificationRoutes({ app: app2, requireAuth }) {
  const notifSvc = new NotificationService();
  app2.get("/api/notifications", requireAuth, asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const notifications2 = await notifSvc.getForUser(req.session.userId, limit);
    res.json(notifications2);
  }));
  app2.get("/api/notifications/unread-count", requireAuth, asyncHandler(async (req, res) => {
    const count4 = await notifSvc.getUnreadCount(req.session.userId);
    res.json({ count: count4 });
  }));
  app2.patch("/api/notifications/:id/read", requireAuth, asyncHandler(async (req, res) => {
    await notifSvc.markAsRead(req.params.id, req.session.userId);
    res.json({ message: "Marked as read" });
  }));
  app2.post("/api/notifications/mark-all-read", requireAuth, asyncHandler(async (req, res) => {
    await notifSvc.markAllAsRead(req.session.userId);
    res.json({ message: "All notifications marked as read" });
  }));
}
var init_notifications = __esm({
  "server/routes/notifications.ts"() {
    "use strict";
    init_notification_service();
    init_async_handler();
  }
});

// server/routes/messages.ts
import { eq as eq11, or, and as and7, desc as desc9 } from "drizzle-orm";
import { z as z4 } from "zod";
function registerMessageRoutes({ app: app2, storage: storage2, requireAuth }) {
  const notifSvc = new NotificationService();
  app2.post("/api/messages", requireAuth, asyncHandler(async (req, res) => {
    try {
      const parsed = sendMessageSchema.parse(req.body);
      const fromUserId = req.session.userId;
      const recipient = await storage2.getProfileById(parsed.toUserId);
      if (!recipient) return res.status(404).json({ message: "Recipient not found" });
      const [message] = await db.insert(messages).values({
        fromUserId,
        toUserId: parsed.toUserId,
        subject: parsed.subject || null,
        body: parsed.body,
        contentId: parsed.contentId || null
      }).returning();
      const sender = await storage2.getProfileById(fromUserId);
      await notifSvc.create(
        parsed.toUserId,
        "message",
        `New message from ${sender?.fullName || "Unknown"}`,
        parsed.subject || parsed.body.slice(0, 100),
        "/messages"
      );
      res.json(message);
    } catch (error) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid message data" });
      throw error;
    }
  }));
  app2.get("/api/messages", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 50;
    const allMessages = await db.select({
      id: messages.id,
      fromUserId: messages.fromUserId,
      toUserId: messages.toUserId,
      subject: messages.subject,
      body: messages.body,
      contentId: messages.contentId,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      fromName: profiles.fullName
    }).from(messages).leftJoin(profiles, eq11(messages.fromUserId, profiles.id)).where(or(eq11(messages.fromUserId, userId), eq11(messages.toUserId, userId))).orderBy(desc9(messages.createdAt)).limit(limit);
    res.json(allMessages);
  }));
  app2.patch("/api/messages/:id/read", requireAuth, asyncHandler(async (req, res) => {
    await db.update(messages).set({ isRead: true }).where(and7(eq11(messages.id, req.params.id), eq11(messages.toUserId, req.session.userId)));
    res.json({ message: "Marked as read" });
  }));
}
var sendMessageSchema;
var init_messages = __esm({
  "server/routes/messages.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_notification_service();
    init_async_handler();
    sendMessageSchema = z4.object({
      toUserId: z4.string().min(1),
      subject: z4.string().optional(),
      body: z4.string().min(1),
      contentId: z4.string().optional()
    });
  }
});

// server/routes/learning-paths.ts
import { eq as eq12, asc, desc as desc10, inArray as inArray5, and as and8 } from "drizzle-orm";
import { z as z5 } from "zod";
async function getPathItems(pathId) {
  return db.select({
    id: learningPathItems.id,
    contentId: learningPathItems.contentId,
    orderIndex: learningPathItems.orderIndex,
    isRequired: learningPathItems.isRequired,
    contentTitle: h5pContent.title,
    contentType: h5pContent.type
  }).from(learningPathItems).innerJoin(h5pContent, eq12(learningPathItems.contentId, h5pContent.id)).where(eq12(learningPathItems.pathId, pathId)).orderBy(asc(learningPathItems.orderIndex));
}
async function batchGetProgress(userIds, contentIds) {
  if (userIds.length === 0 || contentIds.length === 0) return /* @__PURE__ */ new Map();
  const rows = await db.select({
    userId: learnerProgress.userId,
    contentId: learnerProgress.contentId,
    completionPercentage: learnerProgress.completionPercentage,
    completedAt: learnerProgress.completedAt
  }).from(learnerProgress).where(and8(
    inArray5(learnerProgress.userId, userIds),
    inArray5(learnerProgress.contentId, contentIds)
  ));
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    map.set(`${row.userId}:${row.contentId}`, {
      completionPercentage: row.completionPercentage,
      completedAt: row.completedAt
    });
  }
  return map;
}
async function isStudentEnrolledInPathClass(userId, path) {
  if (!path.classId) return false;
  const [enrollment] = await db.select({ id: classEnrollments.id }).from(classEnrollments).where(and8(
    eq12(classEnrollments.classId, path.classId),
    eq12(classEnrollments.userId, userId)
  )).limit(1);
  return !!enrollment;
}
async function isAdmin(userId) {
  const [user] = await db.select({ role: profiles.role }).from(profiles).where(eq12(profiles.id, userId)).limit(1);
  return user?.role === "admin";
}
function registerLearningPathRoutes({ app: app2, storage: storage2, requireAuth, requireTeacher }) {
  app2.post("/api/learning-paths", requireTeacher, asyncHandler(async (req, res) => {
    const parsed = createPathSchema.parse(req.body);
    const path = await db.transaction(async (tx) => {
      const [created] = await tx.insert(learningPaths).values({
        name: parsed.name,
        description: parsed.description || null,
        userId: req.session.userId,
        classId: parsed.classId || null
      }).returning();
      if (parsed.items.length > 0) {
        await tx.insert(learningPathItems).values(
          parsed.items.map((item, i) => ({
            pathId: created.id,
            contentId: item.contentId,
            orderIndex: i,
            isRequired: item.isRequired
          }))
        );
      }
      return created;
    });
    res.json(path);
  }));
  app2.get("/api/learning-paths", requireTeacher, asyncHandler(async (req, res) => {
    const admin = await isAdmin(req.session.userId);
    const query = admin ? db.select().from(learningPaths) : db.select().from(learningPaths).where(eq12(learningPaths.userId, req.session.userId));
    const paths = await query.orderBy(desc10(learningPaths.createdAt));
    res.json(paths);
  }));
  app2.get("/api/learning-paths/:id", requireAuth, asyncHandler(async (req, res) => {
    const [path] = await db.select().from(learningPaths).where(eq12(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });
    const userId = req.session.userId;
    if (path.userId !== userId) {
      const enrolled = await isStudentEnrolledInPathClass(userId, path);
      if (!enrolled) return res.status(403).json({ message: "Not authorized to view this path" });
    }
    const items = await getPathItems(path.id);
    res.json({ ...path, items });
  }));
  app2.put("/api/learning-paths/:id", requireTeacher, asyncHandler(async (req, res) => {
    const [path] = await db.select().from(learningPaths).where(eq12(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });
    if (path.userId !== req.session.userId && !await isAdmin(req.session.userId)) {
      return res.status(403).json({ message: "Not authorized to update this path" });
    }
    const parsed = updatePathSchema.parse(req.body);
    const updated = await db.transaction(async (tx) => {
      const metaUpdates = { updatedAt: /* @__PURE__ */ new Date() };
      if (parsed.name !== void 0) metaUpdates.name = parsed.name;
      if (parsed.description !== void 0) metaUpdates.description = parsed.description || null;
      if (parsed.classId !== void 0) metaUpdates.classId = parsed.classId;
      const [result] = await tx.update(learningPaths).set(metaUpdates).where(eq12(learningPaths.id, path.id)).returning();
      if (parsed.items) {
        await tx.delete(learningPathItems).where(eq12(learningPathItems.pathId, path.id));
        if (parsed.items.length > 0) {
          await tx.insert(learningPathItems).values(
            parsed.items.map((item, i) => ({
              pathId: path.id,
              contentId: item.contentId,
              orderIndex: i,
              isRequired: item.isRequired
            }))
          );
        }
      }
      return result;
    });
    const items = await getPathItems(path.id);
    res.json({ ...updated, items });
  }));
  app2.get("/api/learning-paths/:id/progress", requireAuth, asyncHandler(async (req, res) => {
    const [path] = await db.select().from(learningPaths).where(eq12(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });
    const userId = req.session.userId;
    if (path.userId !== userId) {
      const enrolled = await isStudentEnrolledInPathClass(userId, path);
      if (!enrolled) return res.status(403).json({ message: "Not authorized to view this path" });
    }
    const items = await getPathItems(path.id);
    const contentIds = items.map((i) => i.contentId);
    const progressMap = await batchGetProgress([userId], contentIds);
    const enrichedItems = items.map((item) => {
      const p = progressMap.get(`${userId}:${item.contentId}`);
      return {
        ...item,
        completionPercentage: p?.completionPercentage ?? 0,
        completedAt: p?.completedAt ?? null
      };
    });
    const completed = enrichedItems.filter((p) => p.completionPercentage >= 100).length;
    const currentIndex = enrichedItems.findIndex((p) => p.completionPercentage < 100);
    res.json({
      path,
      items: enrichedItems,
      completed,
      total: items.length,
      currentIndex: currentIndex === -1 ? items.length : currentIndex
    });
  }));
  app2.get("/api/learning-paths/:id/students", requireTeacher, asyncHandler(async (req, res) => {
    const [path] = await db.select().from(learningPaths).where(eq12(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });
    if (path.userId !== req.session.userId && !await isAdmin(req.session.userId)) {
      return res.status(403).json({ message: "Not authorized to view this path" });
    }
    if (!path.classId) {
      return res.json({ path, students: [], items: [] });
    }
    const enrolledStudents = await db.select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email
    }).from(classEnrollments).innerJoin(profiles, eq12(classEnrollments.userId, profiles.id)).where(eq12(classEnrollments.classId, path.classId));
    const items = await getPathItems(path.id);
    const contentIds = items.map((i) => i.contentId);
    const studentIds = enrolledStudents.map((s) => s.id);
    const progressMap = await batchGetProgress(studentIds, contentIds);
    const students = enrolledStudents.map((student) => {
      const itemProgress = items.map((item) => {
        const p = progressMap.get(`${student.id}:${item.contentId}`);
        return {
          contentId: item.contentId,
          contentTitle: item.contentTitle,
          contentType: item.contentType,
          completionPercentage: p?.completionPercentage ?? 0,
          completedAt: p?.completedAt ?? null
        };
      });
      const completedCount = itemProgress.filter((p) => p.completionPercentage >= 100).length;
      return {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        completedItems: completedCount,
        totalItems: items.length,
        progressPercentage: items.length > 0 ? Math.round(completedCount / items.length * 100) : 0,
        items: itemProgress
      };
    });
    res.json({ path, students, items });
  }));
  app2.get("/api/student/learning-paths", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const enrollments = await db.select({ classId: classEnrollments.classId }).from(classEnrollments).where(eq12(classEnrollments.userId, userId));
    const classIds = enrollments.map((e) => e.classId);
    if (classIds.length === 0) return res.json([]);
    const paths = await db.select().from(learningPaths).where(inArray5(learningPaths.classId, classIds)).orderBy(desc10(learningPaths.createdAt));
    if (paths.length === 0) return res.json([]);
    const pathIds = paths.map((p) => p.id);
    const allItems = await db.select({
      pathId: learningPathItems.pathId,
      contentId: learningPathItems.contentId
    }).from(learningPathItems).where(inArray5(learningPathItems.pathId, pathIds));
    const allContentIds = Array.from(new Set(allItems.map((i) => i.contentId)));
    const progressMap = await batchGetProgress([userId], allContentIds);
    const itemsByPath = /* @__PURE__ */ new Map();
    for (const item of allItems) {
      const list = itemsByPath.get(item.pathId) || [];
      list.push(item.contentId);
      itemsByPath.set(item.pathId, list);
    }
    const enriched = paths.map((path) => {
      const contentIds = itemsByPath.get(path.id) || [];
      const completedCount = contentIds.filter((cid) => {
        const p = progressMap.get(`${userId}:${cid}`);
        return p && p.completionPercentage >= 100;
      }).length;
      return {
        id: path.id,
        name: path.name,
        description: path.description,
        totalItems: contentIds.length,
        completedItems: completedCount,
        progressPercentage: contentIds.length > 0 ? Math.round(completedCount / contentIds.length * 100) : 0
      };
    });
    res.json(enriched);
  }));
  app2.delete("/api/learning-paths/:id", requireTeacher, asyncHandler(async (req, res) => {
    const [path] = await db.select().from(learningPaths).where(eq12(learningPaths.id, req.params.id)).limit(1);
    if (!path) return res.status(404).json({ message: "Path not found" });
    if (path.userId !== req.session.userId && !await isAdmin(req.session.userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await db.delete(learningPaths).where(eq12(learningPaths.id, req.params.id));
    res.json({ message: "Learning path deleted" });
  }));
}
var createPathSchema, updatePathSchema;
var init_learning_paths = __esm({
  "server/routes/learning-paths.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_async_handler();
    createPathSchema = z5.object({
      name: z5.string().min(1),
      description: z5.string().optional(),
      classId: z5.string().optional(),
      items: z5.array(z5.object({
        contentId: z5.string().min(1),
        isRequired: z5.boolean().default(true)
      }))
    });
    updatePathSchema = z5.object({
      name: z5.string().min(1).optional(),
      description: z5.string().optional(),
      classId: z5.string().nullable().optional(),
      items: z5.array(z5.object({
        contentId: z5.string().min(1),
        isRequired: z5.boolean().default(true)
      })).optional()
    });
  }
});

// server/routes/student-groups.ts
import { eq as eq13, and as and9 } from "drizzle-orm";
import { z as z6 } from "zod";
function registerStudentGroupRoutes({ app: app2, requireTeacher }) {
  app2.post("/api/student-groups", requireTeacher, asyncHandler(async (req, res) => {
    const parsed = createGroupSchema.parse(req.body);
    const [group] = await db.insert(studentGroups).values({
      classId: parsed.classId,
      name: parsed.name,
      description: parsed.description || null
    }).returning();
    if (parsed.memberIds && parsed.memberIds.length > 0) {
      await db.insert(studentGroupMembers).values(
        parsed.memberIds.map((userId) => ({ groupId: group.id, userId }))
      );
    }
    res.json(group);
  }));
  app2.get("/api/classes/:classId/groups", requireTeacher, asyncHandler(async (req, res) => {
    const groups = await db.select().from(studentGroups).where(eq13(studentGroups.classId, req.params.classId));
    const enriched = await Promise.all(
      groups.map(async (group) => {
        const members = await db.select({
          userId: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email
        }).from(studentGroupMembers).innerJoin(profiles, eq13(studentGroupMembers.userId, profiles.id)).where(eq13(studentGroupMembers.groupId, group.id));
        return { ...group, members };
      })
    );
    res.json(enriched);
  }));
  app2.post("/api/student-groups/:groupId/members", requireTeacher, asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });
    const [member] = await db.insert(studentGroupMembers).values({
      groupId: req.params.groupId,
      userId
    }).returning();
    res.json(member);
  }));
  app2.delete("/api/student-groups/:groupId/members/:userId", requireTeacher, asyncHandler(async (req, res) => {
    await db.delete(studentGroupMembers).where(
      and9(eq13(studentGroupMembers.groupId, req.params.groupId), eq13(studentGroupMembers.userId, req.params.userId))
    );
    res.json({ message: "Member removed" });
  }));
  app2.delete("/api/student-groups/:id", requireTeacher, asyncHandler(async (req, res) => {
    await db.delete(studentGroups).where(eq13(studentGroups.id, req.params.id));
    res.json({ message: "Group deleted" });
  }));
}
var createGroupSchema;
var init_student_groups = __esm({
  "server/routes/student-groups.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_async_handler();
    createGroupSchema = z6.object({
      classId: z6.string().min(1),
      name: z6.string().min(1),
      description: z6.string().optional(),
      memberIds: z6.array(z6.string()).optional()
    });
  }
});

// server/routes/parent-view.ts
import { eq as eq14 } from "drizzle-orm";
import crypto3 from "crypto";
function registerParentViewRoutes({ app: app2, storage: storage2, requireAuth }) {
  app2.post("/api/student/parent-link", requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const user = await storage2.getProfileById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const token = crypto3.randomBytes(32).toString("hex");
    await db.update(profiles).set({ parentShareToken: token }).where(eq14(profiles.id, userId));
    res.json({ token });
  }));
  app2.get("/api/parent-view/:token", asyncHandler(async (req, res) => {
    const token = req.params.token;
    if (!token || token.length < 32) return res.status(400).json({ message: "Invalid token" });
    const [student] = await db.select().from(profiles).where(eq14(profiles.parentShareToken, token)).limit(1);
    if (!student) return res.status(404).json({ message: "Invalid or expired link" });
    const assignments = await storage2.getStudentAssignments(student.id);
    const allProgress = await storage2.getAllUserProgress(student.id);
    const classes2 = await storage2.getStudentClasses(student.id);
    const scores = [];
    const contentIds = Array.from(new Set(assignments.map((a) => a.contentId)));
    for (const contentId of contentIds) {
      const attempts = await storage2.getQuizAttempts(student.id, contentId);
      if (attempts.length > 0) {
        const assignment = assignments.find((a) => a.contentId === contentId);
        const best = attempts.reduce(
          (b, a) => a.score / a.totalQuestions > b.score / b.totalQuestions ? a : b
        );
        scores.push({
          contentTitle: assignment?.contentTitle ?? "Unknown",
          className: assignment?.className ?? "",
          bestPercentage: Math.round(best.score / best.totalQuestions * 100),
          bestScore: best.score,
          bestTotal: best.totalQuestions
        });
      }
    }
    const totalAssignments = assignments.length;
    const completedAssignments = allProgress.filter((p) => p.completionPercentage >= 100).length;
    const avgCompletion = allProgress.length > 0 ? Math.round(allProgress.reduce((sum2, p) => sum2 + p.completionPercentage, 0) / allProgress.length) : 0;
    res.json({
      studentName: student.fullName,
      totalClasses: classes2.length,
      totalAssignments,
      completedAssignments,
      avgCompletion,
      scores
    });
  }));
}
var init_parent_view = __esm({
  "server/routes/parent-view.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_async_handler();
  }
});

// server/routes/rubrics.ts
import { eq as eq15 } from "drizzle-orm";
import { z as z7 } from "zod";
function registerRubricRoutes({ app: app2, storage: storage2, requireTeacher, requireAuth }) {
  app2.post("/api/rubrics", requireTeacher, asyncHandler(async (req, res) => {
    const parsed = createRubricSchema.parse(req.body);
    const [rubric] = await db.insert(rubrics).values({
      contentId: parsed.contentId,
      userId: req.session.userId,
      criteria: parsed.criteria,
      maxScore: parsed.maxScore
    }).returning();
    res.json(rubric);
  }));
  app2.get("/api/rubrics/content/:contentId", requireAuth, asyncHandler(async (req, res) => {
    const [rubric] = await db.select().from(rubrics).where(eq15(rubrics.contentId, req.params.contentId)).limit(1);
    if (!rubric) return res.status(404).json({ message: "No rubric found for this content" });
    res.json(rubric);
  }));
  app2.post("/api/rubrics/:rubricId/score/:studentId", requireTeacher, asyncHandler(async (req, res) => {
    const parsed = scoreStudentSchema.parse(req.body);
    const [score] = await db.insert(rubricScores).values({
      rubricId: req.params.rubricId,
      studentId: req.params.studentId,
      scores: parsed.scores,
      totalScore: parsed.totalScore,
      feedback: parsed.feedback || null
    }).onConflictDoUpdate({
      target: [rubricScores.rubricId, rubricScores.studentId],
      set: {
        scores: parsed.scores,
        totalScore: parsed.totalScore,
        feedback: parsed.feedback || null,
        scoredAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    res.json(score);
  }));
  app2.get("/api/rubrics/:rubricId/scores", requireTeacher, asyncHandler(async (req, res) => {
    const scores = await db.select({
      id: rubricScores.id,
      studentId: rubricScores.studentId,
      studentName: profiles.fullName,
      studentEmail: profiles.email,
      scores: rubricScores.scores,
      totalScore: rubricScores.totalScore,
      feedback: rubricScores.feedback,
      scoredAt: rubricScores.scoredAt
    }).from(rubricScores).innerJoin(profiles, eq15(rubricScores.studentId, profiles.id)).where(eq15(rubricScores.rubricId, req.params.rubricId));
    res.json(scores);
  }));
  app2.delete("/api/rubrics/:id", requireTeacher, asyncHandler(async (req, res) => {
    const [rubric] = await db.select().from(rubrics).where(eq15(rubrics.id, req.params.id)).limit(1);
    if (!rubric || rubric.userId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await db.delete(rubrics).where(eq15(rubrics.id, req.params.id));
    res.json({ message: "Rubric deleted" });
  }));
}
var criterionSchema, createRubricSchema, scoreStudentSchema;
var init_rubrics = __esm({
  "server/routes/rubrics.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_async_handler();
    criterionSchema = z7.object({
      name: z7.string().min(1),
      description: z7.string().optional(),
      levels: z7.array(z7.object({
        label: z7.string(),
        points: z7.number().min(0),
        description: z7.string().optional()
      })).min(1)
    });
    createRubricSchema = z7.object({
      contentId: z7.string().min(1),
      criteria: z7.array(criterionSchema).min(1),
      maxScore: z7.number().min(1)
    });
    scoreStudentSchema = z7.object({
      scores: z7.record(z7.object({
        level: z7.string(),
        points: z7.number()
      })),
      totalScore: z7.number().min(0),
      feedback: z7.string().optional()
    });
  }
});

// server/repositories/curriculum-repository.ts
var CurriculumRepository, curriculumRepository;
var init_curriculum_repository = __esm({
  "server/repositories/curriculum-repository.ts"() {
    "use strict";
    init_db();
    CurriculumRepository = class {
      /** Distinct subjects available in the curriculum spine. */
      async getSubjects() {
        const result = await pool.query(
          `SELECT DISTINCT subject_slug, subject_name
       FROM curriculum_spine_strands
       ORDER BY subject_name`
        );
        return result.rows.map((r) => ({ subjectSlug: r.subject_slug, subjectName: r.subject_name }));
      }
      /** Grade levels available for a given subject. */
      async getGrades(subjectSlug) {
        const result = await pool.query(
          `SELECT DISTINCT grade_level
       FROM curriculum_spine_strands
       WHERE subject_slug = $1
       ORDER BY grade_level`,
          [subjectSlug]
        );
        return result.rows.map((r) => ({ gradeLevel: r.grade_level }));
      }
      /** Strands for a subject + grade combination. */
      async getStrands(subjectSlug, gradeLevel) {
        const result = await pool.query(
          `SELECT id, strand_name, strand_order
       FROM curriculum_spine_strands
       WHERE subject_slug = $1 AND grade_level = $2
       ORDER BY strand_order`,
          [subjectSlug, gradeLevel]
        );
        return result.rows.map((r) => ({ id: r.id, strandName: r.strand_name, strandOrder: r.strand_order }));
      }
      /** Essential Learning Outcomes under a strand. */
      async getElos(strandId) {
        const result = await pool.query(
          `SELECT id, elo_text, elo_order
       FROM curriculum_spine_elos
       WHERE strand_id = $1
       ORDER BY elo_order`,
          [strandId]
        );
        return result.rows.map((r) => ({ id: r.id, eloText: r.elo_text, eloOrder: r.elo_order }));
      }
      /** Specific Curriculum Outcomes under an ELO. */
      async getScos(eloId) {
        const result = await pool.query(
          `SELECT id, sco_text, sco_order
       FROM curriculum_spine_scos
       WHERE elo_id = $1
       ORDER BY sco_order`,
          [eloId]
        );
        return result.rows.map((r) => ({ id: r.id, scoText: r.sco_text, scoOrder: r.sco_order }));
      }
    };
    curriculumRepository = new CurriculumRepository();
  }
});

// server/routes/curriculum.ts
function registerCurriculumRoutes({ app: app2, requireAuth }) {
  app2.get("/api/curriculum/subjects", requireAuth, asyncHandler(async (_req, res) => {
    const subjects = await curriculumRepository.getSubjects();
    res.json(subjects);
  }));
  app2.get("/api/curriculum/grades", requireAuth, asyncHandler(async (req, res) => {
    const { subject } = req.query;
    if (!subject || typeof subject !== "string") {
      return res.status(400).json({ message: "subject query parameter is required" });
    }
    const grades = await curriculumRepository.getGrades(subject);
    res.json(grades);
  }));
  app2.get("/api/curriculum/strands", requireAuth, asyncHandler(async (req, res) => {
    const { subject, grade } = req.query;
    if (!subject || typeof subject !== "string" || !grade || typeof grade !== "string") {
      return res.status(400).json({ message: "subject and grade query parameters are required" });
    }
    const strands = await curriculumRepository.getStrands(subject, grade);
    res.json(strands);
  }));
  app2.get("/api/curriculum/elos", requireAuth, asyncHandler(async (req, res) => {
    const { strandId } = req.query;
    if (!strandId || typeof strandId !== "string") {
      return res.status(400).json({ message: "strandId query parameter is required" });
    }
    const elos = await curriculumRepository.getElos(strandId);
    res.json(elos);
  }));
  app2.get("/api/curriculum/scos", requireAuth, asyncHandler(async (req, res) => {
    const { eloId } = req.query;
    if (!eloId || typeof eloId !== "string") {
      return res.status(400).json({ message: "eloId query parameter is required" });
    }
    const scos = await curriculumRepository.getScos(eloId);
    res.json(scos);
  }));
}
var init_curriculum = __esm({
  "server/routes/curriculum.ts"() {
    "use strict";
    init_curriculum_repository();
    init_async_handler();
  }
});

// server/routes/admin.ts
import { eq as eq16, desc as desc11, sql as sql5, count as count3, and as and11, gte, inArray as inArray6 } from "drizzle-orm";
function registerAdminRoutes({ app: app2, requireAdmin }) {
  app2.get("/api/admin/stats", requireAdmin, asyncHandler(async (_req, res) => {
    const [[userStats], [contentStats], [classStats], [quizStats]] = await Promise.all([
      db.select({
        total: count3(),
        teachers: count3(sql5`CASE WHEN ${profiles.role} = 'teacher' THEN 1 END`),
        students: count3(sql5`CASE WHEN ${profiles.role} = 'student' THEN 1 END`),
        admins: count3(sql5`CASE WHEN ${profiles.role} = 'admin' THEN 1 END`)
      }).from(profiles),
      db.select({
        total: count3(),
        published: count3(sql5`CASE WHEN ${h5pContent.isPublished} = true THEN 1 END`),
        public: count3(sql5`CASE WHEN ${h5pContent.isPublic} = true THEN 1 END`)
      }).from(h5pContent),
      db.select({ total: count3() }).from(classes),
      db.select({
        total: count3(),
        avgScore: sql5`COALESCE(ROUND(AVG(${quizAttempts.score}::decimal / NULLIF(${quizAttempts.totalQuestions}, 0) * 100), 1), 0)`
      }).from(quizAttempts)
    ]);
    res.json({
      users: userStats,
      content: contentStats,
      classes: classStats,
      quizzes: quizStats
    });
  }));
  app2.get("/api/admin/content-by-type", requireAdmin, asyncHandler(async (_req, res) => {
    const rows = await db.select({
      type: h5pContent.type,
      count: count3()
    }).from(h5pContent).groupBy(h5pContent.type).orderBy(desc11(count3()));
    res.json(rows);
  }));
  app2.get("/api/admin/content", requireAdmin, asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const typeFilter = req.query.type;
    const search = req.query.search;
    const conditions = [];
    if (typeFilter && typeFilter !== "all") {
      conditions.push(eq16(h5pContent.type, typeFilter));
    }
    if (search) {
      conditions.push(sql5`LOWER(${h5pContent.title}) LIKE LOWER(${"%" + search + "%"})`);
    }
    const whereClause = conditions.length > 0 ? and11(...conditions) : void 0;
    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: h5pContent.id,
        title: h5pContent.title,
        description: h5pContent.description,
        type: h5pContent.type,
        isPublished: h5pContent.isPublished,
        isPublic: h5pContent.isPublic,
        subject: h5pContent.subject,
        gradeLevel: h5pContent.gradeLevel,
        tags: h5pContent.tags,
        createdAt: h5pContent.createdAt,
        updatedAt: h5pContent.updatedAt,
        creatorId: profiles.id,
        creatorName: profiles.fullName,
        creatorEmail: profiles.email
      }).from(h5pContent).leftJoin(profiles, eq16(h5pContent.userId, profiles.id)).where(whereClause).orderBy(desc11(h5pContent.createdAt)).limit(limit).offset(offset),
      db.select({ total: count3() }).from(h5pContent).where(whereClause)
    ]);
    res.json({
      items: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  }));
  app2.get("/api/admin/users", requireAdmin, asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const roleFilter = req.query.role;
    const search = req.query.search;
    const conditions = [];
    if (roleFilter && roleFilter !== "all") {
      conditions.push(eq16(profiles.role, roleFilter));
    }
    if (search) {
      conditions.push(
        sql5`(LOWER(${profiles.fullName}) LIKE LOWER(${"%" + search + "%"}) OR LOWER(${profiles.email}) LIKE LOWER(${"%" + search + "%"}))`
      );
    }
    const whereClause = conditions.length > 0 ? and11(...conditions) : void 0;
    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        role: profiles.role,
        institution: profiles.institution,
        authProvider: profiles.authProvider,
        createdAt: profiles.createdAt
      }).from(profiles).where(whereClause).orderBy(desc11(profiles.createdAt)).limit(limit).offset(offset),
      db.select({ total: count3() }).from(profiles).where(whereClause)
    ]);
    const userIds = rows.map((r) => r.id);
    const contentCounts = userIds.length > 0 ? await db.select({
      userId: h5pContent.userId,
      count: count3()
    }).from(h5pContent).where(inArray6(h5pContent.userId, userIds)).groupBy(h5pContent.userId) : [];
    const countMap = new Map(contentCounts.map((c) => [c.userId, c.count]));
    const usersWithCounts = rows.map((u) => ({
      ...u,
      contentCount: countMap.get(u.id) || 0
    }));
    res.json({
      items: usersWithCounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  }));
  app2.get("/api/admin/activity", requireAdmin, asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const rows = await db.select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
      userName: profiles.fullName,
      userEmail: profiles.email
    }).from(auditLog).leftJoin(profiles, eq16(auditLog.userId, profiles.id)).orderBy(desc11(auditLog.createdAt)).limit(limit);
    res.json(rows);
  }));
  app2.get("/api/admin/content-timeline", requireAdmin, asyncHandler(async (_req, res) => {
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const rows = await db.select({
      date: sql5`DATE(${h5pContent.createdAt})`,
      count: count3()
    }).from(h5pContent).where(gte(h5pContent.createdAt, thirtyDaysAgo)).groupBy(sql5`DATE(${h5pContent.createdAt})`).orderBy(sql5`DATE(${h5pContent.createdAt})`);
    res.json(rows);
  }));
  app2.delete("/api/admin/content/:id", requireAdmin, asyncHandler(async (req, res) => {
    const contentId = req.params.id;
    const content = await db.select().from(h5pContent).where(eq16(h5pContent.id, contentId)).limit(1);
    if (content.length === 0) {
      return res.status(404).json({ message: "Content not found" });
    }
    await db.delete(h5pContent).where(eq16(h5pContent.id, contentId));
    await db.insert(auditLog).values({
      userId: req.session.userId,
      action: "admin_content_deleted",
      entityType: "content",
      entityId: contentId,
      metadata: { title: content[0].title, type: content[0].type }
    });
    res.json({ message: "Content deleted" });
  }));
  app2.patch("/api/admin/users/:id/role", requireAdmin, asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;
    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (userId === req.session.userId) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }
    const updated = await db.update(profiles).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq16(profiles.id, userId)).returning();
    if (updated.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    await db.insert(auditLog).values({
      userId: req.session.userId,
      action: "admin_role_changed",
      entityType: "user",
      entityId: userId,
      metadata: { newRole: role, userName: updated[0].fullName }
    });
    res.json({ message: "Role updated", user: { id: updated[0].id, role: updated[0].role } });
  }));
}
var init_admin = __esm({
  "server/routes/admin.ts"() {
    "use strict";
    init_async_handler();
    init_db();
    init_schema();
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
async function registerRoutes(app2) {
  app2.set("trust proxy", 1);
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  let sessionStore;
  const isVercel2 = !!process.env.VERCEL;
  if (pool) {
    const PgSession = connectPgSimple(session);
    try {
      await pool.query("SELECT NOW()");
      sessionStore = new PgSession({
        pool,
        createTableIfMissing: true,
        tableName: "session",
        pruneSessionInterval: isVercel2 ? false : 900,
        errorLog: (error) => console.error("Session store error:", error)
      });
    } catch (error) {
      console.error("Failed to connect to PostgreSQL for sessions:", error);
      sessionStore = void 0;
    }
  }
  const isGoogleOAuthAvailable = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const isMicrosoftOAuthAvailable = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: isVercel2,
    // Vercel serverless: always re-save to keep session alive
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1e3 * 60 * 60 * 24 * 7,
      // 7 days
      ...process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}
    }
  };
  if (sessionStore) sessionConfig.store = sessionStore;
  app2.use(session(sessionConfig));
  app2.use(passport_config_default.initialize());
  app2.use(passport_config_default.session());
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
  const requireTeacher = async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const profile = await storage.getProfileById(req.session.userId);
      if (!profile || profile.role === "student") {
        return res.status(403).json({ message: "This feature is only available to teachers" });
      }
      next();
    } catch {
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
  app2.get("/api/health", async (_req, res) => {
    try {
      if (pool) {
        await pool.query("SELECT 1");
        return res.json({ status: "ok", db: "connected" });
      }
      return res.status(503).json({
        status: "degraded",
        db: "disconnected",
        error: "Database pool not initialized"
      });
    } catch (err) {
      return res.status(503).json({
        status: "degraded",
        db: "disconnected",
        error: err.message || "Unknown database error"
      });
    }
  });
  const requireAdmin = async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const profile = await storage.getProfileById(req.session.userId);
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "This feature is only available to administrators" });
      }
      next();
    } catch {
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
  const ctx = { app: app2, storage, requireAuth, requireTeacher, requireAdmin };
  registerAuthRoutes(ctx, isGoogleOAuthAvailable, isMicrosoftOAuthAvailable);
  registerContentRoutes(ctx);
  registerAIRoutes(ctx);
  registerAnalyticsRoutes(ctx);
  registerClassRoutes(ctx);
  registerPresentationRoutes(ctx);
  registerClassroomRoutes(ctx);
  registerStudentRoutes(ctx);
  registerNotificationRoutes(ctx);
  registerMessageRoutes(ctx);
  registerLearningPathRoutes(ctx);
  registerStudentGroupRoutes(ctx);
  registerParentViewRoutes(ctx);
  registerRubricRoutes(ctx);
  registerCurriculumRoutes(ctx);
  registerAdminRoutes(ctx);
  const httpServer = createServer(app2);
  setupWebSocket(httpServer);
  return httpServer;
}
var init_routes = __esm({
  "server/routes.ts"() {
    "use strict";
    init_websocket();
    init_db();
    init_storage();
    init_passport_config();
    init_auth();
    init_content();
    init_ai();
    init_analytics();
    init_classes();
    init_presentations();
    init_classroom();
    init_student();
    init_notifications();
    init_messages();
    init_learning_paths();
    init_student_groups();
    init_parent_view();
    init_rubrics();
    init_curriculum();
    init_admin();
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
