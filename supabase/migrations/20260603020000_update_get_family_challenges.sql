-- Update get_family_challenges to honour family_week_assignments.
-- Rotating (non-general, non-attendance) challenges are now filtered to only
-- return the one challenge assigned to this family for this week.
-- General challenges and attendance challenges are unaffected.

DROP FUNCTION IF EXISTS public.get_family_challenges(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.get_family_challenges(
    p_marathon_id integer,
    p_family_id   integer,
    p_week_id     integer DEFAULT NULL
)
RETURNS TABLE (
    id                            integer,
    marathon_id                   integer,
    title                         text,
    description                   text,
    challenge_type                text,
    game_type                     text,
    points                        integer,
    is_general                    boolean,
    uses_percentage_based_scoring boolean,
    is_active                     boolean,
    created_at                    timestamptz,
    editable_by_roles             text[],
    week_challenge_id             bigint,
    week_id                       bigint,
    family_id                     integer,
    points_awarded                integer,
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
        c.challenge_type::text,
        c.game_type::text,
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
    JOIN week_challenges wc
      ON wc.challenge_id = c.id
    LEFT JOIN family_scores fs
      ON fs.week_challenge_id = wc.id
     AND fs.family_id = p_family_id
    WHERE c.marathon_id = p_marathon_id
      AND (p_week_id IS NULL OR wc.week_id = p_week_id)
      AND (
          -- 1. General challenges — always visible to every family
          c.is_general = true

          -- 2. Attendance challenges — apply to all families every week
          OR c.challenge_type = 'attendance'

          -- 3. Rotating challenges — only the one assigned to this family this week
          OR EXISTS (
              SELECT 1
              FROM   family_week_assignments fwa
              WHERE  fwa.family_id    = p_family_id
                AND  fwa.week_id      = wc.week_id
                AND  fwa.challenge_id = c.id
          )
      );
END;
$$;

-- Grant execute to authenticated users (matches existing RLS pattern)
GRANT EXECUTE ON FUNCTION public.get_family_challenges(integer, integer, integer) TO authenticated;
