-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.attendance (
  id integer NOT NULL DEFAULT nextval('attendance_id_seq'::regclass),
  participant_id uuid,
  week_id integer,
  recorded_by uuid,
  attended boolean DEFAULT false,
  notes text,
  recorded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.users(id),
  CONSTRAINT attendance_week_id_fkey FOREIGN KEY (week_id) REFERENCES public.weeks(id),
  CONSTRAINT attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id)
);
CREATE TABLE public.challenges (
  id integer NOT NULL DEFAULT nextval('challenges_id_seq'::regclass),
  marathon_id integer,
  title character varying NOT NULL,
  description text,
  challenge_type character varying NOT NULL CHECK (challenge_type::text = ANY (ARRAY['kahoot'::character varying, 'project'::character varying, 'attendance'::character varying, 'activity'::character varying, 'game'::character varying, 'tournament'::character varying, 'confession'::character varying]::text[])),
  game_type character varying,
  points integer DEFAULT 100,
  is_general boolean DEFAULT false,
  uses_percentage_based_scoring boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  editable_by_roles ARRAY DEFAULT ARRAY['admin'::text] CHECK (editable_by_roles <@ ARRAY['admin'::text, 'leader'::text, 'participant'::text, 'game_manager'::text]),
  CONSTRAINT challenges_pkey PRIMARY KEY (id),
  CONSTRAINT challenges_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES public.marathons(id)
);
CREATE TABLE public.families (
  id integer NOT NULL DEFAULT nextval('families_id_seq'::regclass),
  marathon_id integer,
  name character varying NOT NULL,
  cover_url text,
  created_at timestamp with time zone DEFAULT now(),
  avatar_url text,
  CONSTRAINT families_pkey PRIMARY KEY (id),
  CONSTRAINT families_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES public.marathons(id)
);
CREATE TABLE public.family_scores (
  id integer NOT NULL DEFAULT nextval('team_scores_id_seq'::regclass),
  family_id integer,
  week_challenge_id integer,
  points_awarded integer DEFAULT 0 CHECK (points_awarded >= 0),
  percentage_score numeric CHECK (percentage_score IS NULL OR percentage_score >= 0::numeric AND percentage_score <= 100::numeric),
  notes text,
  submitted_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  challenge_id integer,
  CONSTRAINT family_scores_pkey PRIMARY KEY (id),
  CONSTRAINT team_scores_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id),
  CONSTRAINT team_scores_week_challenge_id_fkey FOREIGN KEY (week_challenge_id) REFERENCES public.week_challenges(id),
  CONSTRAINT team_scores_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id),
  CONSTRAINT family_scores_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.marathons (
  id integer NOT NULL DEFAULT nextval('marathons_id_seq'::regclass),
  title character varying NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  picture_url text DEFAULT 'https://qwnkzzsbnfqsjtiqabre.supabase.co/storage/v1/object/public/marathon/marathon_logos/default_marathon_logo.png'::text,
  status character varying DEFAULT 'upcoming'::character varying CHECK (status::text = ANY (ARRAY['upcoming'::character varying, 'active'::character varying, 'completed'::character varying]::text[])),
  show_games boolean NOT NULL DEFAULT true,
  show_family_picker boolean NOT NULL DEFAULT false,
  CONSTRAINT marathons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.scoring_configs (
  id integer NOT NULL DEFAULT nextval('scoring_configs_id_seq'::regclass),
  challenge_id integer,
  min_percentage numeric NOT NULL,
  max_percentage numeric NOT NULL,
  points integer NOT NULL CHECK (points >= 0),
  CONSTRAINT scoring_configs_pkey PRIMARY KEY (id),
  CONSTRAINT scoring_configs_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.tournament_families (
  id integer NOT NULL DEFAULT nextval('tournament_families_id_seq'::regclass),
  tournament_id integer,
  family_id integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tournament_families_pkey PRIMARY KEY (id),
  CONSTRAINT tournament_families_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id),
  CONSTRAINT tournament_families_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id)
);
CREATE TABLE public.tournament_match_scores (
  id integer NOT NULL DEFAULT nextval('tournament_match_scores_id_seq'::regclass),
  tournament_match_id integer,
  family_id integer,
  challenge_id integer,
  points_awarded integer DEFAULT 0 CHECK (points_awarded >= 0),
  percentage_score numeric CHECK (percentage_score IS NULL OR percentage_score >= 0::numeric AND percentage_score <= 100::numeric),
  submitted_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tournament_match_scores_pkey PRIMARY KEY (id),
  CONSTRAINT tournament_match_scores_tournament_match_id_fkey FOREIGN KEY (tournament_match_id) REFERENCES public.tournament_matches(id),
  CONSTRAINT tournament_match_scores_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id),
  CONSTRAINT tournament_match_scores_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id),
  CONSTRAINT tournament_match_scores_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id)
);
CREATE TABLE public.tournament_matches (
  id integer NOT NULL DEFAULT nextval('tournament_matches_id_seq'::regclass),
  tournament_id integer,
  week_id integer,
  family1_id integer,
  family2_id integer,
  winner_family_id integer,
  match_date timestamp with time zone,
  status character varying DEFAULT 'scheduled'::character varying CHECK (status::text = ANY (ARRAY['scheduled'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tournament_matches_pkey PRIMARY KEY (id),
  CONSTRAINT tournament_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id),
  CONSTRAINT tournament_matches_week_id_fkey FOREIGN KEY (week_id) REFERENCES public.weeks(id),
  CONSTRAINT tournament_matches_family1_id_fkey FOREIGN KEY (family1_id) REFERENCES public.families(id),
  CONSTRAINT tournament_matches_family2_id_fkey FOREIGN KEY (family2_id) REFERENCES public.families(id),
  CONSTRAINT tournament_matches_winner_family_id_fkey FOREIGN KEY (winner_family_id) REFERENCES public.families(id)
);
CREATE TABLE public.tournaments (
  id integer NOT NULL DEFAULT nextval('tournaments_id_seq'::regclass),
  marathon_id integer,
  title character varying NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status character varying DEFAULT 'planned'::character varying CHECK (status::text = ANY (ARRAY['planned'::character varying, 'active'::character varying, 'completed'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tournaments_pkey PRIMARY KEY (id),
  CONSTRAINT tournaments_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES public.marathons(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  role character varying DEFAULT 'participant'::character varying CHECK (role::text = ANY (ARRAY['participant'::text, 'leader'::text, 'admin'::text, 'game_manager'::text])),
  family_id integer,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id)
);
CREATE TABLE public.week_challenges (
  id integer NOT NULL DEFAULT nextval('week_challenges_id_seq'::regclass),
  week_id integer,
  challenge_id integer,
  due_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT week_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT week_challenges_week_id_fkey FOREIGN KEY (week_id) REFERENCES public.weeks(id),
  CONSTRAINT week_challenges_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.weeks (
  id integer NOT NULL DEFAULT nextval('weeks_id_seq'::regclass),
  marathon_id integer,
  week_number integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT weeks_pkey PRIMARY KEY (id),
  CONSTRAINT weeks_marathon_id_fkey FOREIGN KEY (marathon_id) REFERENCES public.marathons(id)
);