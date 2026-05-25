-- Migration: challenge_assignments
-- Allows admins to assign a specific leader as the sole editor of a challenge (per marathon).
-- If no assignment exists for a challenge, any user with edit rights can edit it.

CREATE TABLE IF NOT EXISTS challenge_assignments (
  id          serial PRIMARY KEY,
  marathon_id integer NOT NULL REFERENCES marathons(id) ON DELETE CASCADE,
  challenge_id integer NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marathon_id, challenge_id)
);

ALTER TABLE challenge_assignments ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read assignments (needed to show owner name in UI)
DO $$ BEGIN
  CREATE POLICY "authenticated users can read challenge assignments"
    ON challenge_assignments FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only admins can insert/update/delete assignments
DO $$ BEGIN
  CREATE POLICY "admins can manage challenge assignments"
    ON challenge_assignments FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
