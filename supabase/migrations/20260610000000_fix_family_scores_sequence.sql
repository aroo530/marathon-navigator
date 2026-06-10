-- The family_scores table was renamed from team_scores; the sequence
-- (team_scores_id_seq) was reset independently of the table data, leaving it
-- behind the actual MAX(id). Reset it so new inserts get non-conflicting IDs.
SELECT setval(
    pg_get_serial_sequence('public.family_scores', 'id'),
    COALESCE((SELECT MAX(id) FROM public.family_scores), 0)
);
