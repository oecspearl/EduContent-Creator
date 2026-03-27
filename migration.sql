-- ============================================================
-- EduContent Creator - Full Database Migration
-- Run this against your new Supabase PostgreSQL database
-- Aligned with original production database schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. Session table (used by connect-pg-simple for Express sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- ============================================================
-- 2. Profiles table (users - teachers, students, admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT,
  "full_name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'teacher',
  "institution" TEXT,
  "auth_provider" TEXT DEFAULT 'email',
  "google_id" TEXT,
  "microsoft_id" TEXT,
  "google_access_token" TEXT,
  "google_refresh_token" TEXT,
  "google_token_expiry" TIMESTAMP,
  "password_reset_token" TEXT,
  "password_reset_expiry" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. H5P Content table (quizzes, flashcards, videos, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS "h5p_content" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "user_id" VARCHAR NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "is_published" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_public" BOOLEAN NOT NULL DEFAULT FALSE,
  "tags" TEXT[],
  "subject" TEXT,
  "grade_level" TEXT,
  "age_range" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_h5p_content_user_id" ON "h5p_content"("user_id");
CREATE INDEX IF NOT EXISTS "idx_h5p_content_type" ON "h5p_content"("type");
CREATE INDEX IF NOT EXISTS "idx_h5p_content_public" ON "h5p_content"("is_public", "is_published");

-- ============================================================
-- 4. Content Shares table
-- ============================================================
CREATE TABLE IF NOT EXISTS "content_shares" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "content_id" VARCHAR NOT NULL REFERENCES "h5p_content"("id") ON DELETE CASCADE,
  "shared_by" VARCHAR NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_content_shares_content_id" ON "content_shares"("content_id");

-- ============================================================
-- 5. Learner Progress table
-- ============================================================
CREATE TABLE IF NOT EXISTS "learner_progress" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "content_id" VARCHAR NOT NULL REFERENCES "h5p_content"("id") ON DELETE CASCADE,
  "completion_percentage" REAL NOT NULL DEFAULT 0,
  "completed_at" TIMESTAMP,
  "last_accessed_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "learner_name" TEXT,
  "session_id" VARCHAR,
  UNIQUE("user_id", "content_id")
);

CREATE INDEX IF NOT EXISTS "idx_learner_progress_user_id" ON "learner_progress"("user_id");
CREATE INDEX IF NOT EXISTS "idx_learner_progress_content_id" ON "learner_progress"("content_id");

-- ============================================================
-- 6. Quiz Attempts table
-- ============================================================
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "content_id" VARCHAR NOT NULL REFERENCES "h5p_content"("id") ON DELETE CASCADE,
  "score" INTEGER NOT NULL,
  "total_questions" INTEGER NOT NULL,
  "answers" JSONB NOT NULL,
  "completed_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_quiz_attempts_user_id" ON "quiz_attempts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_quiz_attempts_content_id" ON "quiz_attempts"("content_id");

-- ============================================================
-- 7. Interaction Events table
-- ============================================================
CREATE TABLE IF NOT EXISTS "interaction_events" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "content_id" VARCHAR NOT NULL REFERENCES "h5p_content"("id") ON DELETE CASCADE,
  "event_type" TEXT NOT NULL,
  "event_data" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_interaction_events_user_content" ON "interaction_events"("user_id", "content_id");

-- ============================================================
-- 8. Chat Messages table (AI assistant conversation history)
-- ============================================================
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "context" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_chat_messages_user_id" ON "chat_messages"("user_id");

-- ============================================================
-- 9. Classes table
-- ============================================================
CREATE TABLE IF NOT EXISTS "classes" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "user_id" VARCHAR NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "subject" TEXT,
  "grade_level" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_classes_user_id" ON "classes"("user_id");

-- ============================================================
-- 10. Class Enrollments table (students <-> classes)
-- ============================================================
CREATE TABLE IF NOT EXISTS "class_enrollments" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "class_id" VARCHAR NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "user_id" VARCHAR NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "enrolled_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("class_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_class_enrollments_class_id" ON "class_enrollments"("class_id");
CREATE INDEX IF NOT EXISTS "idx_class_enrollments_user_id" ON "class_enrollments"("user_id");

-- ============================================================
-- 11. Content Assignments table (content <-> classes)
-- ============================================================
CREATE TABLE IF NOT EXISTS "content_assignments" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "content_id" VARCHAR NOT NULL REFERENCES "h5p_content"("id") ON DELETE CASCADE,
  "class_id" VARCHAR NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "assigned_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "due_date" TIMESTAMP,
  "instructions" TEXT,
  UNIQUE("content_id", "class_id")
);

CREATE INDEX IF NOT EXISTS "idx_content_assignments_content_id" ON "content_assignments"("content_id");
CREATE INDEX IF NOT EXISTS "idx_content_assignments_class_id" ON "content_assignments"("class_id");

-- ============================================================
-- 12. Assignments table (teacher-created assignments with rubrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS "assignments" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "lesson_plan_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "rubric_criteria" TEXT,
  "standards" TEXT,
  "instructions" TEXT,
  "due_date" TIMESTAMPTZ,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_assignments_created_by" ON "assignments"("created_by");

-- ============================================================
-- 13. Assignment Submissions table (student submissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS "assignment_submissions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "assignment_id" TEXT NOT NULL REFERENCES "assignments"("id") ON DELETE CASCADE,
  "student_id" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_type" TEXT,
  "extracted_text" TEXT,
  "submitted_at" TIMESTAMPTZ DEFAULT NOW(),
  "status" TEXT DEFAULT 'submitted'
);

CREATE INDEX IF NOT EXISTS "idx_submissions_assignment_id" ON "assignment_submissions"("assignment_id");
CREATE INDEX IF NOT EXISTS "idx_submissions_student_id" ON "assignment_submissions"("student_id");

-- ============================================================
-- 14. Grades table (AI + teacher grading)
-- ============================================================
CREATE TABLE IF NOT EXISTS "grades" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id" TEXT NOT NULL REFERENCES "assignment_submissions"("id") ON DELETE CASCADE,
  "preliminary_grade" TEXT,
  "final_grade" TEXT,
  "ai_feedback" TEXT,
  "teacher_notes" TEXT,
  "rubric_scores" TEXT,
  "standards_performance" TEXT,
  "graded_at" TIMESTAMPTZ,
  "graded_by" TEXT,
  "status" TEXT DEFAULT 'pending',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_grades_submission_id" ON "grades"("submission_id");

-- ============================================================
-- Done! All 14 tables created successfully.
-- ============================================================
