-- ============================================================
-- Migration: Curriculum Tables
-- Creates all tables needed for the OECS curriculum data.
-- Run this BEFORE the data migration (add_curriculum_data.sql).
-- ============================================================

-- ─── Curriculum Spine (core hierarchy) ──────────────────────

-- Strands: top-level curriculum groupings per subject per grade
CREATE TABLE IF NOT EXISTS curriculum_spine_strands (
  id VARCHAR PRIMARY KEY,
  subject_id VARCHAR NOT NULL,
  grade_id VARCHAR NOT NULL,
  subject_name VARCHAR NOT NULL,
  subject_slug VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand_name VARCHAR NOT NULL,
  strand_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS spine_strands_subject_grade_idx
  ON curriculum_spine_strands(subject_slug, grade_level);
CREATE INDEX IF NOT EXISTS spine_strands_subject_id_idx
  ON curriculum_spine_strands(subject_id);

-- Essential Learning Outcomes: broad learning goals within a strand
CREATE TABLE IF NOT EXISTS curriculum_spine_elos (
  id VARCHAR PRIMARY KEY,
  strand_id VARCHAR NOT NULL REFERENCES curriculum_spine_strands(id) ON DELETE CASCADE,
  elo_text TEXT NOT NULL,
  elo_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS spine_elos_strand_id_idx
  ON curriculum_spine_elos(strand_id);

-- Specific Curriculum Outcomes: granular skills under each ELO
CREATE TABLE IF NOT EXISTS curriculum_spine_scos (
  id VARCHAR PRIMARY KEY,
  elo_id VARCHAR NOT NULL REFERENCES curriculum_spine_elos(id) ON DELETE CASCADE,
  strand_id VARCHAR NOT NULL REFERENCES curriculum_spine_strands(id) ON DELETE CASCADE,
  subject_id VARCHAR NOT NULL,
  subject_slug VARCHAR NOT NULL,
  grade_id VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand_name VARCHAR NOT NULL,
  sco_text TEXT NOT NULL,
  sco_order INTEGER NOT NULL DEFAULT 0,
  integrated_units JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS spine_scos_elo_id_idx
  ON curriculum_spine_scos(elo_id);
CREATE INDEX IF NOT EXISTS spine_scos_strand_id_idx
  ON curriculum_spine_scos(strand_id);
CREATE INDEX IF NOT EXISTS spine_scos_subject_grade_idx
  ON curriculum_spine_scos(subject_slug, grade_level);

-- ─── Curriculum Enrichment (AI lesson plan data) ────────────

-- Activities per ELO
CREATE TABLE IF NOT EXISTS curriculum_activities (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  activity_number INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  description TEXT NOT NULL,
  activity_type VARCHAR NOT NULL,
  materials JSONB DEFAULT '[]'::jsonb,
  integration_subjects JSONB,
  difficulty_level VARCHAR,
  duration_minutes INTEGER,
  group_size VARCHAR NOT NULL DEFAULT 'individual',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS curriculum_activities_subject_grade_idx
  ON curriculum_activities(subject, grade_level);
CREATE INDEX IF NOT EXISTS curriculum_activities_elo_idx
  ON curriculum_activities(subject, grade_level, elo_number);

-- Assessment strategies per ELO
CREATE TABLE IF NOT EXISTS curriculum_assessment_strategies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  strategy_type VARCHAR NOT NULL,
  strategy_category VARCHAR NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS curriculum_assessment_subject_grade_idx
  ON curriculum_assessment_strategies(subject, grade_level);

-- Media resources per ELO (YouTube videos, books, interactives)
CREATE TABLE IF NOT EXISTS curriculum_media_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS curriculum_media_subject_grade_idx
  ON curriculum_media_resources(subject, grade_level);

-- Extended metadata per ELO
CREATE TABLE IF NOT EXISTS curriculum_elo_metadata (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  elo_title TEXT NOT NULL,
  elo_description TEXT NOT NULL,
  grade_expectations TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS curriculum_elo_meta_subject_grade_idx
  ON curriculum_elo_metadata(subject, grade_level);

-- ─── Learning Standards (OECS standards) ────────────────────

CREATE TABLE IF NOT EXISTS curriculum_learning_standards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL,
  description TEXT NOT NULL,
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  strand_code VARCHAR NOT NULL,
  sub_strand VARCHAR NOT NULL,
  sub_strand_code VARCHAR NOT NULL,
  domain VARCHAR,
  grade_grouping VARCHAR NOT NULL,
  standard_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS learning_standards_subject_grade_idx
  ON curriculum_learning_standards(subject, grade_level);
CREATE INDEX IF NOT EXISTS learning_standards_code_idx
  ON curriculum_learning_standards(code);

-- ─── Legacy Curriculum Tables ───────────────────────────────

-- Legacy strands (admin page)
CREATE TABLE IF NOT EXISTS curriculum_legacy_strands (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT NOT NULL,
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Legacy essential learning outcomes (admin page)
CREATE TABLE IF NOT EXISTS curriculum_legacy_elos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  strand_id VARCHAR NOT NULL REFERENCES curriculum_legacy_strands(id) ON DELETE CASCADE,
  code VARCHAR NOT NULL,
  description TEXT NOT NULL,
  grade_expectations TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Legacy specific curriculum outcomes (selectors, lesson plans, admin)
CREATE TABLE IF NOT EXISTS curriculum_legacy_scos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  elo_id VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  code VARCHAR NOT NULL,
  description TEXT NOT NULL,
  sub_strand VARCHAR,
  sub_strand_number VARCHAR,
  elo_title VARCHAR,
  elo_number VARCHAR,
  outcome_type VARCHAR,
  section VARCHAR,
  theme VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS legacy_scos_subject_grade_idx
  ON curriculum_legacy_scos(subject, grade_level);
CREATE INDEX IF NOT EXISTS legacy_scos_code_idx
  ON curriculum_legacy_scos(code);
CREATE INDEX IF NOT EXISTS legacy_scos_elo_id_idx
  ON curriculum_legacy_scos(elo_id);

-- ─── Empty Enrichment Tables (schema ready for future data) ─

CREATE TABLE IF NOT EXISTS curriculum_assessment_questions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR NOT NULL,
  options JSONB,
  correct_answer TEXT,
  difficulty_level VARCHAR,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_differentiation_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  level VARCHAR NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_learning_strategies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  strategy_name VARCHAR NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_materials_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  resource_name VARCHAR NOT NULL,
  description TEXT NOT NULL,
  resource_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_subject_integration (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  target_subject VARCHAR NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_teacher_knowledge (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR NOT NULL,
  grade_level VARCHAR NOT NULL,
  strand VARCHAR NOT NULL,
  elo_number VARCHAR NOT NULL,
  topic VARCHAR NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
