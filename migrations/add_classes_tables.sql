-- Migration: Add classes, enrollments, and content assignments tables
-- Run this SQL script in your database to add class management functionality

-- Classes table - stores class/group information
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT,
    grade_level TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Class enrollments table - many-to-many relationship between students and classes
CREATE TABLE IF NOT EXISTS class_enrollments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id VARCHAR NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(class_id, user_id)
);

-- Content assignments table - assigns content to classes
CREATE TABLE IF NOT EXISTS content_assignments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL REFERENCES h5p_content(id) ON DELETE CASCADE,
    class_id VARCHAR NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
    due_date TIMESTAMP,
    instructions TEXT,
    UNIQUE(content_id, class_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user_id ON class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_content_id ON content_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_class_id ON content_assignments(class_id);

