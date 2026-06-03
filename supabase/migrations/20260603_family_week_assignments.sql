-- Each family is assigned exactly one rotating challenge per week.
-- attendance & mass are global (all families, all weeks) and stay in week_challenges.

CREATE TABLE IF NOT EXISTS family_week_assignments (
  id           bigserial PRIMARY KEY,
  family_id    bigint NOT NULL REFERENCES families(id)    ON DELETE CASCADE,
  week_id      bigint NOT NULL REFERENCES weeks(id)       ON DELETE CASCADE,
  challenge_id bigint NOT NULL REFERENCES challenges(id)  ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, week_id)
);

ALTER TABLE family_week_assignments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed in the app to show "your mission this week")
DO $$ BEGIN
  CREATE POLICY "authenticated users can read family_week_assignments"
    ON family_week_assignments FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only admins and leaders can write
DO $$ BEGIN
  CREATE POLICY "leaders can manage family_week_assignments"
    ON family_week_assignments FOR ALL TO authenticated
    USING (EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin','leader')
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin','leader')
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
