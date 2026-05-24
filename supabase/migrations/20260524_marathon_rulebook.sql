-- Migration: marathon_rulebook
-- Extends the schema to support the full Call of Duty themed marathon rulebook.
--
-- Changes:
--   1. Extend challenge_type CHECK to include 'confession'; drop 'game' (all missions are now challenges)
--   2. Add marathons.status column
--   3. Add marathons.show_games column (hides Games tab per marathon)
--   4. Add users.updated_at column
--   5. Recreate marathon_with_family_count view to expose show_games

-- 1. Extend challenge_type CHECK — add 'confession', keep all existing types
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_challenge_type_check;
ALTER TABLE challenges ADD CONSTRAINT challenges_challenge_type_check
  CHECK (challenge_type = ANY (ARRAY[
    'kahoot'::text,
    'project'::text,
    'attendance'::text,
    'activity'::text,
    'game'::text,
    'tournament'::text,
    'confession'::text
  ]));

-- 2. marathons.status
ALTER TABLE marathons
  ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'upcoming'
  CHECK (status = ANY (ARRAY['upcoming'::text, 'active'::text, 'completed'::text]));

-- 3. marathons.show_games
ALTER TABLE marathons
  ADD COLUMN IF NOT EXISTS show_games boolean NOT NULL DEFAULT true;

-- 4. users.updated_at
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 5. Recreate marathon_with_family_count view to include new columns
--    (Drop and recreate; adjust the SELECT to match whatever the original view contained.)
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
  m.created_at,
  COUNT(DISTINCT f.id)::integer AS family_count,
  COUNT(DISTINCT w.id)::integer AS week_count
FROM marathons m
LEFT JOIN families f ON f.marathon_id = m.id
LEFT JOIN weeks w ON w.marathon_id = m.id
GROUP BY m.id;
