CREATE TABLE public.attendance (
  id bigint primary key generated always as identity,
  participant_id uuid NULL,
  week_id integer NULL,
  recorded_by uuid NULL,
  attended boolean NULL DEFAULT false,
  notes text NULL,
  recorded_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT attendance_participant_id_week_id_key UNIQUE (participant_id, week_id),
  CONSTRAINT attendance_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id),
  CONSTRAINT attendance_week_id_fkey FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attendance_participant_week ON public.attendance USING btree (participant_id, week_id);
CREATE INDEX IF NOT EXISTS idx_attendance_week_id ON public.attendance USING btree (week_id);

CREATE TABLE public.challenges (
  id bigint primary key generated always as identity,
  marathon_id integer NULL,
  title text NOT NULL,
  description text NULL,
  challenge_type text NOT NULL,
  game_type text NULL,
  points integer NULL DEFAULT 100,
  is_general boolean NULL DEFAULT false,
  uses_percentage_based_scoring boolean NULL DEFAULT false,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT challenges_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES marathons(id) ON DELETE CASCADE,
  CONSTRAINT challenges_challenge_type_check CHECK (challenge_type IN ('kahoot', 'project', 'attendance', 'activity', 'game', 'tournament'))
);
CREATE INDEX IF NOT EXISTS idx_challenges_marathon_id ON public.challenges USING btree (marathon_id);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON public.challenges USING btree (challenge_type);

CREATE TABLE public.families (
  id bigint primary key generated always as identity,
  marathon_id integer NULL,
  name text NOT NULL,
  cover_url text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  avatar_url text NULL,
  CONSTRAINT families_marathon_id_name_key UNIQUE (marathon_id, name),
  CONSTRAINT families_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES marathons(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_families_marathon_id ON public.families USING btree (marathon_id);

CREATE TABLE public.family_scores (
  id bigint primary key generated always as identity,
  family_id integer NULL,
  week_challenge_id integer NULL,
  points_awarded integer NULL DEFAULT 0,
  percentage_score numeric(5,2) NULL,
  notes text NULL,
  submitted_by uuid NULL,
  submitted_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT team_scores_family_id_week_challenge_id_key UNIQUE (family_id, week_challenge_id),
  CONSTRAINT team_scores_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT team_scores_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id),
  CONSTRAINT team_scores_week_challenge_id_fkey FOREIGN KEY (week_challenge_id) REFERENCES week_challenges(id) ON DELETE CASCADE,
  CONSTRAINT team_scores_percentage_score_check CHECK (percentage_score IS NULL OR (percentage_score >= 0 AND percentage_score <= 100)),
  CONSTRAINT team_scores_points_awarded_check CHECK (points_awarded >= 0)
);
CREATE INDEX IF NOT EXISTS idx_team_scores_family_id ON public.family_scores USING btree (family_id);
CREATE INDEX IF NOT EXISTS idx_team_scores_week_challenge_id ON public.family_scores USING btree (week_challenge_id);

CREATE VIEW public.marathon_with_family_count AS 
SELECT m.id,
       m.title,
       m.description,
       m.start_date,
       m.end_date,
       m.created_at,
       m.picture_url,
       (SELECT count(*) FROM families f WHERE f.marathon_id = m.id) AS family_count
FROM marathons m;

CREATE TABLE public.marathons (
  id bigint primary key generated always as identity,
  title text NOT NULL,
  description text NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  picture_url text NULL DEFAULT 'https://qwnkzzsbnfqsjtiqabre.supabase.co/storage/v1/object/public/marathon/marathon_logos/default_marathon_logo.png'
);

CREATE TABLE public.scoring_configs (
  id bigint primary key generated always as identity,
  challenge_id integer NULL,
  min_percentage numeric(5,2) NOT NULL,
  max_percentage numeric(5,2) NOT NULL,
  points integer NOT NULL,
  CONSTRAINT scoring_configs_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
  CONSTRAINT scoring_configs_check CHECK (min_percentage >= 0 AND max_percentage <= 100),
  CONSTRAINT scoring_configs_check1 CHECK (min_percentage <= max_percentage),
  CONSTRAINT scoring_configs_points_check CHECK (points >= 0)
);

CREATE TABLE public.tournament_families (
  id bigint primary key generated always as identity,
  tournament_id integer NULL,
  family_id integer NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT tournament_families_tournament_id_family_id_key UNIQUE (tournament_id, family_id),
  CONSTRAINT tournament_families_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT tournament_families_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tournament_families_tournament_id ON public.tournament_families USING btree (tournament_id);

CREATE TABLE public.tournament_match_scores (
  id bigint primary key generated always as identity,
  tournament_match_id integer NULL,
  family_id integer NULL,
  challenge_id integer NULL,
  points_awarded integer NULL DEFAULT 0,
  percentage_score numeric(5,2) NULL,
  submitted_by uuid NULL,
  submitted_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT tournament_match_scores_tournament_match_id_family_id_chall_key UNIQUE (tournament_match_id, family_id, challenge_id),
  CONSTRAINT tournament_match_scores_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
  CONSTRAINT tournament_match_scores_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT tournament_match_scores_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id),
  CONSTRAINT tournament_match_scores_tournament_match_id_fkey FOREIGN KEY (tournament_match_id) REFERENCES tournament_matches(id) ON DELETE CASCADE,
  CONSTRAINT tournament_match_scores_points_awarded_check CHECK (points_awarded >= 0),
  CONSTRAINT tournament_match_scores_percentage_score_check CHECK (percentage_score IS NULL OR (percentage_score >= 0 AND percentage_score <= 100))
);
CREATE INDEX IF NOT EXISTS idx_tournament_match_scores_match_id ON public.tournament_match_scores USING btree (tournament_match_id);

CREATE TABLE public.tournament_matches (
  id bigint primary key generated always as identity,
  tournament_id integer NULL,
  week_id integer NULL,
  family1_id integer NULL,
  family2_id integer NULL,
  winner_family_id integer NULL,
  match_date timestamp with time zone NULL,
  status text NULL DEFAULT 'scheduled',
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT tournament_matches_family1_id_fkey FOREIGN KEY (family1_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT tournament_matches_family2_id_fkey FOREIGN KEY (family2_id) REFERENCES families(id) ON DELETE CASCADE,