-- Migration: Add subject, gradeLevel, and ageRange fields to h5p_content table
-- Date: 2025-01-XX
-- Description: Adds metadata fields for content categorization

-- Add subject column
ALTER TABLE h5p_content 
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add grade_level column
ALTER TABLE h5p_content 
ADD COLUMN IF NOT EXISTS grade_level TEXT;

-- Add age_range column
ALTER TABLE h5p_content 
ADD COLUMN IF NOT EXISTS age_range TEXT;

-- Add comments for documentation
COMMENT ON COLUMN h5p_content.subject IS 'Subject area (e.g., English Language, Mathematics, Science)';
COMMENT ON COLUMN h5p_content.grade_level IS 'Grade level (e.g., Kindergarten, Grade 1, Grade 2)';
COMMENT ON COLUMN h5p_content.age_range IS 'Age range (e.g., 3-5 years, 5-7 years)';

