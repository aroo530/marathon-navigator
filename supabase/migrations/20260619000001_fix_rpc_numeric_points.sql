-- Update get_family_challenges to return points as numeric(10,2)
-- to match the column type change in 20260619000000_float_degrees_support.
-- Must drop first — PostgreSQL does not allow changing a function's return type in-place.

DROP FUNCTION IF EXISTS public.get_family_challenges(integer, integer, integer);

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
    points                        numeric(10,2),
    is_general                    boolean,
    uses_percentage_based_scoring boolean,
    is_active                     boolean,
    created_at                    timestamptz,
    editable_by_roles             text[],
    week_challenge_id             integer,
    week_id                       integer,
    family_id                     integer,
    points_awarded                numeric(10,2),
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
            c.is_general = true
            OR (wc.id IS NOT NULL AND (
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
