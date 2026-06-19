-- Fix upsert_family_score: change p_points_awarded and v_points_awarded
-- from integer to numeric(10,2) to support decimal scores.

CREATE OR REPLACE FUNCTION public.upsert_family_score(
    p_family_id          integer,
    p_challenge_id       integer,
    p_points_awarded     numeric(10,2) DEFAULT NULL,
    p_week_challenge_id  integer       DEFAULT NULL,
    p_percentage_score   numeric       DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_uses_pct         BOOLEAN;
    v_points_awarded   numeric(10,2);
    v_percentage_score NUMERIC;
BEGIN
    SELECT uses_percentage_based_scoring
      INTO v_uses_pct
    FROM public.challenges
    WHERE id = p_challenge_id;

    IF v_uses_pct THEN
        IF p_percentage_score IS NULL THEN
            RAISE EXCEPTION 'percentage required for challenge %', p_challenge_id;
        END IF;

        SELECT sc.points
          INTO v_points_awarded
        FROM public.scoring_configs sc
        WHERE sc.challenge_id     = p_challenge_id
          AND p_percentage_score >= sc.min_percentage
          AND p_percentage_score <= sc.max_percentage
        LIMIT 1;

        IF NOT FOUND THEN
            v_points_awarded := 0;
        END IF;

        v_percentage_score := p_percentage_score;

    ELSE
        IF p_points_awarded IS NULL THEN
            RAISE EXCEPTION 'points_awarded required for non-percentage challenge %', p_challenge_id;
        END IF;

        v_points_awarded   := p_points_awarded;
        v_percentage_score := NULL;
    END IF;

    IF p_week_challenge_id IS NOT NULL THEN
        INSERT INTO family_scores(
            family_id, week_challenge_id, challenge_id,
            points_awarded, percentage_score, submitted_at
        ) VALUES (
            p_family_id, p_week_challenge_id, p_challenge_id,
            v_points_awarded, v_percentage_score, NOW()
        )
        ON CONFLICT (family_id, week_challenge_id)
        DO UPDATE SET
            challenge_id     = EXCLUDED.challenge_id,
            points_awarded   = EXCLUDED.points_awarded,
            percentage_score = EXCLUDED.percentage_score,
            submitted_at     = NOW();
    ELSE
        INSERT INTO family_scores(
            family_id, challenge_id,
            points_awarded, percentage_score, submitted_at
        ) VALUES (
            p_family_id, p_challenge_id,
            v_points_awarded, v_percentage_score, NOW()
        )
        ON CONFLICT (family_id, challenge_id) WHERE (week_challenge_id IS NULL)
        DO UPDATE SET
            points_awarded   = EXCLUDED.points_awarded,
            percentage_score = EXCLUDED.percentage_score,
            submitted_at     = NOW();
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_family_score(integer, integer, numeric, integer, numeric) TO authenticated;
