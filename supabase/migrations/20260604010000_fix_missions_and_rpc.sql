-- Fix three mission issues for the Call of Duty marathon (marathon_id = 2):
--   1. الزيتونة (id 32) was miscategorized as attendance, breaking the scan→score
--      lookup (.maybeSingle() errors on two attendance+NULL rows). Reclassify to a
--      new 'fixed_weekly' type — appears per-week for all families like القداس, but
--      is not an attendance scan mission.
--   2. General/fixed missions (الاعتراف, قلب واحد, المحفوظات يونيو/يوليو) have no
--      week_challenges rows, so the INNER JOIN in get_family_challenges hid them.
--      Switch to LEFT JOIN so general missions surface (once, week-agnostic).
--   3. Add scoring tiers for الزيتونة (76-100→30, 51-75→20, 25-50→10).

-- ─── 1. Extend CHECK constraint to allow 'fixed_weekly' ──────────────────────────
ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_challenge_type_check;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_challenge_type_check
  CHECK (challenge_type IN ('kahoot','project','attendance','activity','game','tournament','confession','fixed_weekly'));

-- ─── 2. Reclassify الزيتونة (id 32) → fixed_weekly ───────────────────────────────
UPDATE public.challenges
SET challenge_type = 'fixed_weekly',
    game_type = NULL,
    uses_percentage_based_scoring = true
WHERE id = 32 AND marathon_id = 2;

-- ─── 3. Scoring tiers for الزيتونة (same cadence as الحضور/القداس) ────────────────
INSERT INTO scoring_configs (challenge_id, min_percentage, max_percentage, points)
VALUES
  (32, 76, 100, 30),
  (32, 51,  75, 20),
  (32, 25,  50, 10)
ON CONFLICT DO NOTHING;

-- ─── 4. get_family_challenges: INNER → LEFT JOIN + fixed_weekly support ──────────
CREATE OR REPLACE FUNCTION public.get_family_challenges(
    p_marathon_id integer,
    p_family_id   integer,
    p_week_id     integer DEFAULT NULL
)
RETURNS TABLE (
    id                            integer,
    marathon_id                   integer,
    title                         varchar(200),
    description                   text,
    challenge_type                varchar(50),
    game_type                     varchar(100),
    points                        integer,
    is_general                    boolean,
    uses_percentage_based_scoring boolean,
    is_active                     boolean,
    created_at                    timestamptz,
    editable_by_roles             text[],
    week_challenge_id             integer,
    week_id                       integer,
    family_id                     integer,
    points_awarded                numeric,
    percentage_score              numeric,
    notes                         text,
    submitted_by                  uuid,
    submitted_at                  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.marathon_id,
        c.title,
        c.description,
        c.challenge_type,
        c.game_type,
        c.points,
        c.is_general,
        c.uses_percentage_based_scoring,
        c.is_active,
        c.created_at,
        c.editable_by_roles,
        wc.id              AS week_challenge_id,
        wc.week_id,
        p_family_id        AS family_id,
        COALESCE(fs.points_awarded, 0) AS points_awarded,
        fs.percentage_score,
        fs.notes,
        fs.submitted_by,
        fs.submitted_at
    FROM challenges c
    LEFT JOIN week_challenges wc
           ON wc.challenge_id = c.id
          AND (p_week_id IS NULL OR wc.week_id = p_week_id)
    LEFT JOIN family_scores fs
           ON fs.family_id = p_family_id
          AND (
                fs.week_challenge_id = wc.id
                OR (wc.id IS NULL AND fs.week_challenge_id IS NULL AND fs.challenge_id = c.id)
              )
    WHERE c.marathon_id = p_marathon_id
      AND (
            c.is_general = true                        -- general: one row, week-agnostic
            OR (wc.id IS NOT NULL AND (                -- per-week: only when a wc row matches the week
                  c.challenge_type IN ('attendance', 'fixed_weekly')
                  OR EXISTS (
                      SELECT 1 FROM family_week_assignments fwa
                      WHERE fwa.family_id    = p_family_id
                        AND fwa.week_id      = wc.week_id
                        AND fwa.challenge_id = c.id
                  )
            ))
          );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_challenges(integer, integer, integer) TO authenticated;
