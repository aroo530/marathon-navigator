-- Fix 1: Add FK from challenge_assignments.user_id → public.users(id)
-- so PostgREST can resolve users(full_name) in the select.
ALTER TABLE public.challenge_assignments
  ADD CONSTRAINT challenge_assignments_user_id_public_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix 2: Replace get_family_challenges with explicit varchar→text casts
-- (challenges.title, description, game_type are varchar(200) not text).
DROP FUNCTION IF EXISTS public.get_family_challenges(integer, integer, integer);

CREATE FUNCTION public.get_family_challenges(
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
        c.title::text,
        c.description::text,
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
        fs.notes::text,
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
          c.is_general = true
          OR c.challenge_type = 'attendance'
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

GRANT EXECUTE ON FUNCTION public.get_family_challenges(integer, integer, integer) TO authenticated;
