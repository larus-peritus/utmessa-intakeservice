-- Combined migration file for manual execution
-- Run this in your Neon SQL editor

-- Migration 1: Create ideas and features tables
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(21) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  problem TEXT NOT NULL,
  must_haves JSONB NOT NULL,
  email VARCHAR(254),
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  progress INTEGER,
  current_step TEXT,
  current_feature VARCHAR(100),
  waiting_question TEXT,
  demo_url TEXT,
  repo_url TEXT,
  claimed_by VARCHAR(100),
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ideas_token ON ideas(token);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);

-- Features table for detailed progress tracking
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  feature_id VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Index for idea-feature relationship
CREATE INDEX IF NOT EXISTS idx_features_idea_id ON features(idea_id);

-- Migration 2: Add composite index for queue API queries
CREATE INDEX IF NOT EXISTS idx_ideas_status_created
ON ideas (status, created_at);
