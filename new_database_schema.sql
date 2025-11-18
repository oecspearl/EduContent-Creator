-- OECS Learning Hub - Database Schema
-- Use this schema to create tables in your new database
-- Run this SQL script in your new PostgreSQL database

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT, -- Nullable for OAuth users (who use sentinel passwords)
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher',
    institution TEXT,
    auth_provider TEXT DEFAULT 'email', -- 'email' | 'google' | 'microsoft'
    google_id TEXT,
    microsoft_id TEXT,
    google_access_token TEXT, -- For Google Slides API access
    google_refresh_token TEXT, -- For refreshing access tokens
    google_token_expiry TIMESTAMP, -- When the access token expires
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- H5P Content table (educational content)
CREATE TABLE IF NOT EXISTS h5p_content (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'quiz' | 'flashcard' | 'interactive-video' | 'image-hotspot' | 'drag-drop' | 'fill-blanks' | 'memory-game' | 'interactive-book' | 'video-finder' | 'google-slides'
    data JSONB NOT NULL, -- Stores full content structure (can be very large)
    user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL, -- Share with other teachers
    tags TEXT[], -- Array of tags for filtering
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Content shares table
CREATE TABLE IF NOT EXISTS content_shares (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR NOT NULL REFERENCES h5p_content(id) ON DELETE CASCADE,
    shared_by VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Learner progress table - tracks overall completion for each content item
CREATE TABLE IF NOT EXISTS learner_progress (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id VARCHAR NOT NULL REFERENCES h5p_content(id) ON DELETE CASCADE,
    completion_percentage REAL DEFAULT 0 NOT NULL, -- 0-100
    completed_at TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    learner_name TEXT, -- For anonymous learners
    session_id VARCHAR, -- For session-based tracking
    UNIQUE(user_id, content_id)
);

-- Quiz attempts table - stores individual quiz attempt details
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id VARCHAR NOT NULL REFERENCES h5p_content(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- Number of correct answers
    total_questions INTEGER NOT NULL,
    answers JSONB NOT NULL, -- Array of {questionId, answer, isCorrect}
    completed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Interaction events table - stores granular interaction data
CREATE TABLE IF NOT EXISTS interaction_events (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id VARCHAR NOT NULL REFERENCES h5p_content(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'card_flipped', 'hotspot_completed', 'video_paused', etc.
    event_data JSONB, -- Additional contextual data
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Chat messages table - stores AI assistant conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    context JSONB, -- User's current context (page, content being viewed, etc.)
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Session table (for PostgreSQL session store)
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_h5p_content_user_id ON h5p_content(user_id);
CREATE INDEX IF NOT EXISTS idx_h5p_content_type ON h5p_content(type);
CREATE INDEX IF NOT EXISTS idx_h5p_content_is_published ON h5p_content(is_published);
CREATE INDEX IF NOT EXISTS idx_h5p_content_is_public ON h5p_content(is_public);
CREATE INDEX IF NOT EXISTS idx_learner_progress_user_id ON learner_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_progress_content_id ON learner_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_content_id ON quiz_attempts(content_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_user_id ON interaction_events(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_content_id ON interaction_events(content_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Verify tables were created
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables: profiles, h5p_content, content_shares, learner_progress, quiz_attempts, interaction_events, chat_messages, session';
END $$;

