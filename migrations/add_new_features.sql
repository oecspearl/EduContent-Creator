-- Migration: Add new feature tables and columns
-- Run this against your database to add support for:
--   - Audit logging
--   - Student notifications
--   - Learning paths
--   - Student groups
--   - Messages (student-teacher)
--   - Rubrics (subjective assessment)
--   - Assignment scheduling
--   - Parent/guardian share tokens

-- ============================================================
-- 1. New column on profiles: parent share token
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS parent_share_token TEXT;

-- ============================================================
-- 2. New column on content_assignments: scheduled publish date
-- ============================================================
ALTER TABLE content_assignments
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;

-- ============================================================
-- 3. Audit log table
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================
-- 4. Notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- 5. Learning paths
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_paths (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id VARCHAR REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_path_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id VARCHAR NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  content_id VARCHAR NOT NULL REFERENCES h5p_content(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_learning_path_items_path ON learning_path_items(path_id, order_index);

-- ============================================================
-- 6. Student groups
-- ============================================================
CREATE TABLE IF NOT EXISTS student_groups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id VARCHAR NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_group_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id VARCHAR NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(group_id, user_id)
);

-- ============================================================
-- 7. Messages (student-teacher)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  content_id VARCHAR REFERENCES h5p_content(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user_id, created_at DESC);

-- ============================================================
-- 8. Rubrics (subjective assessment)
-- ============================================================
CREATE TABLE IF NOT EXISTS rubrics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR NOT NULL REFERENCES h5p_content(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  criteria JSONB NOT NULL,
  max_score INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rubric_scores (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id VARCHAR NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  student_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scores JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  feedback TEXT,
  scored_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(rubric_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_rubric_scores_rubric ON rubric_scores(rubric_id);
