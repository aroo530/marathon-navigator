-- Migration: show_tournament
-- Adds a per-marathon flag to hide the Tournament tab (mirrors show_games pattern).

ALTER TABLE marathons
  ADD COLUMN IF NOT EXISTS show_tournament boolean NOT NULL DEFAULT true;

DROP VIEW IF EXISTS marathon_with_family_count;
CREATE OR REPLACE VIEW marathon_with_family_count AS
SELECT
  m.id,
  m.title,
  m.description,
  m.start_date,
  m.end_date,
  m.picture_url,
  m.status,
  m.show_games,
  m.show_tournament,
  m.show_family_picker,
  m.created_at,
  COUNT(DISTINCT f.id)::integer AS family_count,
  COUNT(DISTINCT w.id)::integer AS week_count
FROM marathons m
LEFT JOIN families f ON f.marathon_id = m.id
LEFT JOIN weeks w ON w.marathon_id = m.id
GROUP BY m.id;
