-- Migration: attendance
-- Per-week QR scan check-in for participants.
-- Scanning auto-updates the family's attendance challenge score via refreshAttendanceScore in the app.

CREATE TABLE IF NOT EXISTS attendance (
  id             SERIAL PRIMARY KEY,
  participant_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_id        INTEGER     NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  marathon_id    INTEGER     NOT NULL REFERENCES marathons(id) ON DELETE CASCADE,
  family_id      INTEGER     NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  scanned_by     UUID        REFERENCES users(id),
  scanned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, week_id)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "authenticated users can read attendance"
    ON attendance FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "leaders can record attendance"
    ON attendance FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'leader')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "leaders can remove attendance"
    ON attendance FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'leader')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
