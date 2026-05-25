-- Seed weeks, challenges, scoring_configs, and week_challenges for marathon id=2 (Call of Duty)

DO $$
DECLARE
  w_ids       integer[];
  c_attendance integer;
  c_mass       integer;
  c_confession integer;
  c_memo_jun   integer;
  c_memo_jul   integer;
  w            integer;
BEGIN

-- ─── 0. Reset sequences so INSERTs get fresh IDs ────────────────────────────
PERFORM setval(pg_get_serial_sequence('weeks',      'id'), COALESCE(MAX(id), 0)) FROM weeks;
PERFORM setval(pg_get_serial_sequence('challenges', 'id'), COALESCE(MAX(id), 0)) FROM challenges;
PERFORM setval(pg_get_serial_sequence('week_challenges', 'id'), COALESCE(MAX(id), 0)) FROM week_challenges;
PERFORM setval(pg_get_serial_sequence('scoring_configs', 'id'), COALESCE(MAX(id), 0)) FROM scoring_configs;

-- ─── 1. Weeks (Sat–Fri, 7 weeks) ────────────────────────────────────────────
INSERT INTO weeks (marathon_id, week_number, start_date, end_date) VALUES
  (2, 1, '2026-06-05', '2026-06-11'),
  (2, 2, '2026-06-12', '2026-06-18'),
  (2, 3, '2026-06-19', '2026-06-25'),
  (2, 4, '2026-06-26', '2026-07-02'),
  (2, 5, '2026-07-03', '2026-07-09'),
  (2, 6, '2026-07-10', '2026-07-16'),
  (2, 7, '2026-07-17', '2026-07-24');

SELECT array_agg(id ORDER BY week_number) INTO w_ids FROM weeks WHERE marathon_id = 2;

-- ─── 2. Recurring per-week challenges ───────────────────────────────────────
INSERT INTO challenges (marathon_id, title, challenge_type, game_type, points, is_general, uses_percentage_based_scoring, editable_by_roles)
VALUES (2, 'الحضور', 'attendance', NULL, 30, false, true, ARRAY['admin','leader'])
RETURNING id INTO c_attendance;

INSERT INTO challenges (marathon_id, title, challenge_type, game_type, points, is_general, uses_percentage_based_scoring, editable_by_roles)
VALUES (2, 'القداس', 'attendance', 'mass', 30, false, true, ARRAY['admin','leader'])
RETURNING id INTO c_mass;

-- ─── 3. General challenges (is_general=true) ────────────────────────────────
INSERT INTO challenges (marathon_id, title, challenge_type, game_type, points, is_general, uses_percentage_based_scoring, editable_by_roles)
VALUES (2, 'الاعتراف', 'confession', NULL, 100, true, true, ARRAY['admin','leader'])
RETURNING id INTO c_confession;

INSERT INTO challenges (marathon_id, title, challenge_type, game_type, points, is_general, uses_percentage_based_scoring, editable_by_roles)
VALUES (2, 'قلب واحد', 'activity', 'one_heart', 100, true, false, ARRAY['admin','leader']);

INSERT INTO challenges (marathon_id, title, challenge_type, game_type, points, is_general, uses_percentage_based_scoring, editable_by_roles)
VALUES (2, 'المحفوظات - يونيو', 'activity', 'memorization', 50, true, true, ARRAY['admin','leader'])
RETURNING id INTO c_memo_jun;

INSERT INTO challenges (marathon_id, title, challenge_type, game_type, points, is_general, uses_percentage_based_scoring, editable_by_roles)
VALUES (2, 'المحفوظات - يوليو', 'activity', 'memorization', 50, true, true, ARRAY['admin','leader'])
RETURNING id INTO c_memo_jul;

-- ─── 4. Weekly rotating challenges ──────────────────────────────────────────
INSERT INTO challenges (marathon_id, title, challenge_type, game_type, points, is_general, uses_percentage_based_scoring, editable_by_roles)
VALUES
  (2, 'العباقرة',          'kahoot',   NULL,              50, false, false, ARRAY['admin','leader']),
  (2, 'Escape Room',       'activity', 'escape_room',     50, false, false, ARRAY['admin','leader']),
  (2, 'سلاح المهندسين',   'project',  '3d_model',        50, false, false, ARRAY['admin','leader']),
  (2, 'المبدع الصغير',    'project',  'video',           50, false, false, ARRAY['admin','leader']),
  (2, 'إدارة الأزمة',     'project',  'problem_solving', 50, false, false, ARRAY['admin','leader']),
  (2, 'خط دفاع العقيدة', 'project',  'doctrine',        50, false, false, ARRAY['admin','leader']),
  (2, 'تلخيص الكتاب',    'project',  'book_summary',    50, false, false, ARRAY['admin','leader']);

-- ─── 5. Scoring configs ──────────────────────────────────────────────────────
-- Attendance & Mass: 76-100→30, 51-75→20, 25-50→10
INSERT INTO scoring_configs (challenge_id, min_percentage, max_percentage, points)
VALUES
  (c_attendance, 76, 100, 30), (c_attendance, 51, 75, 20), (c_attendance, 25, 50, 10),
  (c_mass,       76, 100, 30), (c_mass,       51, 75, 20), (c_mass,       25, 50, 10);

-- Confession: 76-100→100, 51-75→50, 25-50→25
INSERT INTO scoring_configs (challenge_id, min_percentage, max_percentage, points)
VALUES
  (c_confession, 76, 100, 100),
  (c_confession, 51,  75,  50),
  (c_confession, 25,  50,  25);

-- Memorization: 75-100→50, 50-74→40, 25-49→30
INSERT INTO scoring_configs (challenge_id, min_percentage, max_percentage, points)
VALUES
  (c_memo_jun, 75, 100, 50), (c_memo_jun, 50, 74, 40), (c_memo_jun, 25, 49, 30),
  (c_memo_jul, 75, 100, 50), (c_memo_jul, 50, 74, 40), (c_memo_jul, 25, 49, 30);

-- ─── 6. week_challenges: الحضور + القداس on every week ──────────────────────
FOREACH w IN ARRAY w_ids LOOP
  INSERT INTO week_challenges (week_id, challenge_id) VALUES (w, c_attendance);
  INSERT INTO week_challenges (week_id, challenge_id) VALUES (w, c_mass);
END LOOP;

-- ─── 7. week_challenges: all 7 rotating challenges on every week ─────────────
INSERT INTO week_challenges (week_id, challenge_id)
SELECT w.week_id, c.id
FROM unnest(w_ids) AS w(week_id)
CROSS JOIN challenges c
WHERE c.marathon_id = 2
  AND c.is_general = false
  AND c.challenge_type IN ('kahoot', 'activity', 'project');

END $$;
