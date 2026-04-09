-- Add review status fields to h5p_content
ALTER TABLE h5p_content ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE h5p_content ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE h5p_content ADD COLUMN IF NOT EXISTS flagged_by VARCHAR REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE h5p_content ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR REFERENCES profiles(id) ON DELETE SET NULL;

-- Content reviews table — review requests assigned to users
CREATE TABLE IF NOT EXISTS content_reviews (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR NOT NULL REFERENCES h5p_content(id) ON DELETE CASCADE,
  requested_by VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS content_reviews_content_id_idx ON content_reviews(content_id);
CREATE INDEX IF NOT EXISTS content_reviews_assigned_to_idx ON content_reviews(assigned_to);
