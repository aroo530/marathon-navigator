-- Ensure each family has at most one score row per week-challenge.
-- This allows safe upsert-by-conflict in the admin tool and prevents
-- duplicate rows from concurrent score submissions.
ALTER TABLE public.family_scores
  ADD CONSTRAINT family_scores_family_week_challenge_unique
  UNIQUE (family_id, week_challenge_id);
