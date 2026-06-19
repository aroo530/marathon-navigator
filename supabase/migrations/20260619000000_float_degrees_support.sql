-- Migration: float_degrees_support
-- Change score columns from integer to numeric(10,2) to support decimal scores
-- (e.g. 47.5, 47.25). Integer values cast losslessly to numeric.
--
-- Affected:
--   challenges.points            — max points available per mission
--   family_scores.points_awarded — actual score given to a family
--   tournament_match_scores.points_awarded — score in tournament matches

-- 1. challenges.points
ALTER TABLE public.challenges
  ALTER COLUMN points TYPE numeric(10,2) USING points::numeric(10,2);

-- 2. family_scores.points_awarded
ALTER TABLE public.family_scores
  ALTER COLUMN points_awarded TYPE numeric(10,2) USING points_awarded::numeric(10,2);

-- 3. tournament_match_scores.points_awarded
ALTER TABLE public.tournament_match_scores
  ALTER COLUMN points_awarded TYPE numeric(10,2) USING points_awarded::numeric(10,2);
