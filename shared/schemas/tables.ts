/**
 * Database table definitions (Drizzle ORM).
 */
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, timestamp, integer, real, unique, index } from "drizzle-orm/pg-core";

// Profiles table
export const profiles = pgTable("profiles", {
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
  parentShareToken: text("parent_share_token"), // Token for parent/guardian read-only access
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// H5P Content table
export const h5pContent = pgTable("h5p_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  data: jsonb("data").notNull(),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  isPublished: boolean("is_published").default(false).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  reviewStatus: text("review_status").default("none").notNull(), // 'none' | 'flagged' | 'in_review' | 'approved' | 'rejected'
  reviewNotes: text("review_notes"),
  flaggedBy: varchar("flagged_by").references(() => profiles.id, { onDelete: "set null" }),
  reviewedBy: varchar("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
  tags: text("tags").array(),
  subject: text("subject"),
  gradeLevel: text("grade_level"),
  ageRange: text("age_range"),
  curriculumContext: jsonb("curriculum_context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("h5p_content_user_id_idx").on(table.userId),
  isPublicIdx: index("h5p_content_is_public_idx").on(table.isPublic),
}));

// Content shares table
export const contentShares = pgTable("content_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  sharedBy: varchar("shared_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Learner progress table
export const learnerProgress = pgTable("learner_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  completionPercentage: real("completion_percentage").notNull().default(0),
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserContent: unique().on(table.userId, table.contentId),
}));

// Quiz attempts table
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  answers: jsonb("answers").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => ({
  userContentIdx: index("quiz_attempts_user_content_idx").on(table.userId, table.contentId),
  contentIdIdx: index("quiz_attempts_content_id_idx").on(table.contentId),
}));

// Interaction events table
export const interactionEvents = pgTable("interaction_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userContentIdx: index("interaction_events_user_content_idx").on(table.userId, table.contentId),
}));

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  context: jsonb("context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Classes table
export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  subject: text("subject"),
  gradeLevel: text("grade_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Class enrollments table
export const classEnrollments = pgTable("class_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
}, (table) => ({
  uniqueClassUser: unique().on(table.classId, table.userId),
  userIdIdx: index("class_enrollments_user_id_idx").on(table.userId),
}));

// Audit log table — tracks grade-related and administrative actions
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => profiles.id, { onDelete: "set null" }),
  action: text("action").notNull(), // 'quiz_completed', 'content_assigned', 'grade_exported', etc.
  entityType: text("entity_type").notNull(), // 'content', 'class', 'assignment', etc.
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'new_assignment', 'due_reminder', 'grade_posted', 'message'
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"), // In-app link to navigate to
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
}));

// Learning paths table — ordered sequences of content
export const learningPaths = pgTable("learning_paths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  classId: varchar("class_id").references(() => classes.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Learning path items — ordered content within a path
export const learningPathItems = pgTable("learning_path_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pathId: varchar("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  isRequired: boolean("is_required").default(true).notNull(),
});

// Student groups within classes
export const studentGroups = pgTable("student_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student group memberships
export const studentGroupMembers = pgTable("student_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => studentGroups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
}, (table) => ({
  uniqueGroupUser: unique().on(table.groupId, table.userId),
}));

// Messages table — student-teacher messaging
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  toUserId: varchar("to_user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  subject: text("subject"),
  body: text("body").notNull(),
  contentId: varchar("content_id").references(() => h5pContent.id, { onDelete: "set null" }), // Optional reference to content
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rubrics table — for subjective assessment
export const rubrics = pgTable("rubrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  criteria: jsonb("criteria").notNull(), // Array of { name, description, levels: [{ label, points, description }] }
  maxScore: integer("max_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rubric scores — teacher-assigned scores per student
export const rubricScores = pgTable("rubric_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rubricId: varchar("rubric_id").notNull().references(() => rubrics.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  scores: jsonb("scores").notNull(), // { [criterionName]: { level, points } }
  totalScore: integer("total_score").notNull(),
  feedback: text("feedback"),
  scoredAt: timestamp("scored_at").defaultNow().notNull(),
}, (table) => ({
  uniqueRubricStudent: unique().on(table.rubricId, table.studentId),
}));

// Student-level content assignments — assign content directly to individual students
export const studentAssignments = pgTable("student_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  instructions: text("instructions"),
}, (table) => ({
  uniqueContentStudent: unique().on(table.contentId, table.studentId),
  studentIdIdx: index("student_assignments_student_id_idx").on(table.studentId),
  contentIdIdx: index("student_assignments_content_id_idx").on(table.contentId),
}));

// Class-level content assignments
export const contentAssignments = pgTable("content_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  scheduledAt: timestamp("scheduled_at"), // Future publish date — null means immediate
  instructions: text("instructions"),
}, (table) => ({
  uniqueContentClass: unique().on(table.contentId, table.classId),
  classIdIdx: index("content_assignments_class_id_idx").on(table.classId),
}));

// Content reviews table — review requests assigned to users
export const contentReviews = pgTable("content_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => h5pContent.id, { onDelete: "cascade" }),
  requestedBy: varchar("requested_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  assignedTo: varchar("assigned_to").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: text("status").default("pending").notNull(), // 'pending' | 'in_progress' | 'completed'
  feedback: text("feedback"),
  checklist: jsonb("checklist"), // Array of { item: string, checked: boolean, notes?: string }
  recommendation: text("recommendation"), // 'approve' | 'reject' | 'needs_changes'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  contentIdIdx: index("content_reviews_content_id_idx").on(table.contentId),
  assignedToIdx: index("content_reviews_assigned_to_idx").on(table.assignedTo),
}));
