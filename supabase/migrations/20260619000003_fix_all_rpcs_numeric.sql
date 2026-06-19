-- Fix all remaining RPCs that return points_awarded or totalpoints as integer.
-- These must be dropped and recreated since PostgreSQL does not allow
-- changing return types in-place.

-- ─── 1. get_family_score_breakdown ───────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_family_score_breakdown(integer, integer);

CREATE OR REPLACE FUNCTION public.get_family_score_breakdown(
    input_marathon_id integer,
    input_family_id   integer
)
RETURNS TABLE(
    source          text,
    challenge_id    integer,
    challenge_title text,
    week_id         integer,
    points_awarded  numeric(10,2),
    submitted_at    timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        'challenge'::text AS source,
        c.id              AS challenge_id,
        c.title::TEXT     AS challenge_title,
        w.id              AS week_id,
        fs.points_awarded,
        fs.submitted_at
    FROM family_scores fs
    LEFT JOIN week_challenges wc ON fs.week_challenge_id = wc.id
    LEFT JOIN challenges c ON c.id = COALESCE(fs.challenge_id, wc.challenge_id)
    LEFT JOIN weeks w ON wc.week_id = w.id
    WHERE fs.family_id = input_family_id
      AND c.marathon_id = input_marathon_id

    UNION ALL

    SELECT
        'tournament'::text AS source,
        c.id               AS challenge_id,
        'Match'::text      AS challenge_title,
        NULL               AS week_id,
        tms.points_awarded,
        tms.submitted_at
    FROM tournament_match_scores tms
    LEFT JOIN challenges c ON tms.challenge_id = c.id
    JOIN tournament_matches tm ON tms.tournament_match_id = tm.id
    JOIN tournaments t ON tm.tournament_id = t.id
    WHERE tms.family_id = input_family_id
      AND t.marathon_id = input_marathon_id

    ORDER BY submitted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_score_breakdown(integer, integer) TO authenticated;

-- ─── 2. get_family_total_scores ──────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_family_total_scores(integer);

CREATE OR REPLACE FUNCTION public.get_family_total_scores(p_marathon_id integer)
RETURNS TABLE(
    rank        integer,
    id          integer,
    name        text,
    avatarurl   text,
    totalpoints numeric(10,2)
)
LANGUAGE sql
STABLE
AS $$
    WITH scored_families AS (
        SELECT
            f.id,
            f.name,
            f.avatar_url AS avatarUrl,
            COALESCE((
                SELECT SUM(ts.points_awarded)
                FROM family_scores ts
                LEFT JOIN week_challenges wc ON ts.week_challenge_id = wc.id
                LEFT JOIN weeks w ON wc.week_id = w.id
                LEFT JOIN challenges c ON c.id = ts.challenge_id
                WHERE ts.family_id = f.id
                  AND (w.marathon_id = p_marathon_id OR c.marathon_id = p_marathon_id)
            ), 0) +
            COALESCE((
                SELECT SUM(tms.points_awarded)
                FROM tournament_match_scores tms
                JOIN tournament_matches tm ON tms.tournament_match_id = tm.id
                WHERE tms.family_id = f.id
                  AND tm.tournament_id IN (
                      SELECT id FROM tournaments WHERE marathon_id = p_marathon_id
                  )
            ), 0) AS totalPoints
        FROM families f
        WHERE f.marathon_id = p_marathon_id
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY totalPoints DESC)::integer AS rank,
        id,
        name,
        avatarUrl,
        totalPoints
    FROM scored_families
    ORDER BY rank;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_total_scores(integer) TO authenticated;

-- ─── 3. get_recent_game_entries (single-arg overload) ────────────────────────

DROP FUNCTION IF EXISTS public.get_recent_game_entries(integer);

CREATE OR REPLACE FUNCTION public.get_recent_game_entries(limit_count integer DEFAULT 10)
RETURNS TABLE(
    id          uuid,
    family_name character varying,
    game_type   character varying,
    points      numeric(10,2),
    created_at  timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fs.id,
        f.name    AS family_name,
        c.title   AS game_type,
        fs.points_awarded,
        fs.submitted_at
    FROM family_scores fs
    JOIN families f ON fs.family_id = f.id
    JOIN challenges c ON c.id = fs.challenge_id
    WHERE c.challenge_type = 'game'
    ORDER BY fs.submitted_at DESC
    LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_game_entries(integer) TO authenticated;

-- ─── 4. get_recent_game_entries (two-arg overload) ───────────────────────────

DROP FUNCTION IF EXISTS public.get_recent_game_entries(integer, integer);

CREATE OR REPLACE FUNCTION public.get_recent_game_entries(p_marathon_id integer, p_limit integer DEFAULT 10)
RETURNS TABLE(
    id              integer,
    family_id       integer,
    family_name     character varying,
    challenge_id    integer,
    challenge_title character varying,
    game_type       character varying,
    points_awarded  numeric(10,2),
    submitted_at    timestamptz,
    submitted_by    uuid,
    notes           text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fs.id,
        fs.family_id,
        f.name            AS family_name,
        fs.challenge_id,
        c.title           AS challenge_title,
        COALESCE(c.game_type, '') AS game_type,
        fs.points_awarded,
        fs.submitted_at,
        fs.submitted_by,
        fs.notes
    FROM family_scores fs
    JOIN families f ON fs.family_id = f.id
    JOIN challenges c ON fs.challenge_id = c.id
    WHERE f.marathon_id = p_marathon_id
      AND c.challenge_type = 'game'
    ORDER BY fs.submitted_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_game_entries(integer, integer) TO authenticated;
