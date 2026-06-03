-- Fix stale Supabase project URL baked into the marathons.picture_url default.
-- The old project (qwnkzzsbnfqsjtiqabre) no longer resolves.

ALTER TABLE public.marathons
  ALTER COLUMN picture_url
  SET DEFAULT 'https://asygijgyvplutjujdiic.supabase.co/storage/v1/object/public/marathon/marathon_logos/default_marathon_logo.png';

-- Also fix any existing rows still pointing at the old URL
UPDATE public.marathons
SET picture_url = 'https://asygijgyvplutjujdiic.supabase.co/storage/v1/object/public/marathon/marathon_logos/default_marathon_logo.png'
WHERE picture_url LIKE '%qwnkzzsbnfqsjtiqabre%';
