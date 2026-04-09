-- Migration: Add curriculum_context field to h5p_content table
-- Description: Persists the OECS curriculum alignment selection so it survives page reloads

ALTER TABLE h5p_content
ADD COLUMN IF NOT EXISTS curriculum_context jsonb;

COMMENT ON COLUMN h5p_content.curriculum_context IS 'OECS Harmonised Primary Curriculum alignment context (subject, grade, strand, ELO, SCOs)';
