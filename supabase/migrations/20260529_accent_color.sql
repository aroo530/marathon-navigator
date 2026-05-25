-- Migration: accent_color
-- Adds a per-marathon accent hex color for branding/theming in the app.

ALTER TABLE marathons
  ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- Seed Call of Duty marathon (id=1 — update if id differs)
UPDATE marathons
  SET accent_color = '#2C3A1E'
  WHERE title ILIKE '%call of duty%' OR title ILIKE '%cod%';

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
  m.accent_color,
  m.created_at,
  COUNT(DISTINCT f.id)::integer AS family_count,
  COUNT(DISTINCT w.id)::integer AS week_count
FROM marathons m
LEFT JOIN families f ON f.marathon_id = m.id
LEFT JOIN weeks w ON w.marathon_id = m.id
GROUP BY m.id;
