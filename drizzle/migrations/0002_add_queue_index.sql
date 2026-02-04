-- Migration: Add composite index for queue API queries
-- Feature: F5 - Ideas Queue API
-- Created: 2026-01-27
--
-- Purpose: Optimize queries that filter by status and sort by createdAt
-- Expected: 10x+ performance improvement for queue queries
-- Query pattern: WHERE status IN (...) ORDER BY createdAt

CREATE INDEX IF NOT EXISTS idx_ideas_status_created
ON ideas (status, created_at);

-- Verify index created with: \d ideas (in psql to see indexes)
-- Test query performance with:
-- EXPLAIN ANALYZE SELECT * FROM ideas WHERE status IN ('submitted', 'ready') ORDER BY created_at LIMIT 50;
