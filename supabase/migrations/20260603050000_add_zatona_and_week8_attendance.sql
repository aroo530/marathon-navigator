-- Add الزيتونة attendance challenge to marathon 2 and wire it to all 8 weeks.
-- Also add الحضور + القداس to week 8 (which was missing them).

INSERT INTO challenges (marathon_id, title, challenge_type, game_type, points, is_general, uses_percentage_based_scoring, editable_by_roles)
VALUES (2, 'الزيتونة', 'attendance', NULL, 30, false, true, ARRAY['admin','leader'])
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  c_zatona integer;
BEGIN
  SELECT id INTO c_zatona FROM challenges WHERE marathon_id = 2 AND title = 'الزيتونة';

  -- الزيتونة on all 8 weeks
  INSERT INTO week_challenges (week_id, challenge_id)
  SELECT w.id, c_zatona FROM weeks w WHERE w.marathon_id = 2
  ON CONFLICT DO NOTHING;

  -- الحضور + القداس on week 8
  INSERT INTO week_challenges (week_id, challenge_id)
  SELECT w.id, c.id
  FROM weeks w
  CROSS JOIN challenges c
  WHERE w.marathon_id = 2 AND w.week_number = 8
    AND c.marathon_id = 2 AND c.title IN ('الحضور', 'القداس')
  ON CONFLICT DO NOTHING;
END $$;
