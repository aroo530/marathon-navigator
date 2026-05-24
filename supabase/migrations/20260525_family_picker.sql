-- Migration: family_picker
-- Adds a per-marathon flag to enable the family picker on the challenges screen.
-- When true, admin/leader users can select any family and enter scores on their behalf.

ALTER TABLE marathons
  ADD COLUMN IF NOT EXISTS show_family_picker boolean NOT NULL DEFAULT false;

-- Recreate view to expose the new column
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
  m.show_family_picker,
  m.created_at,
  COUNT(DISTINCT f.id)::integer AS family_count,
  COUNT(DISTINCT w.id)::integer AS week_count
FROM marathons m
LEFT JOIN families f ON f.marathon_id = m.id
LEFT JOIN weeks w ON w.marathon_id = m.id
GROUP BY m.id;
