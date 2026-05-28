// One-shot script to seed initial users via Supabase admin API.
// Run with: node scripts/create-users.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://asygijgyvplutjujdiic.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEMP_PASSWORD = 'Marathon2026!';

const users = [
  { email: 'arsanymilad45@gmail.com',              role: 'admin',        full_name: 'Arsany Milad' },
  { email: 'arsanymilad45+leader@gmail.com',        role: 'leader',       full_name: 'Test Leader' },
  { email: 'arsanymilad45+participant@gmail.com',   role: 'participant',  full_name: 'Test Participant' },
  { email: 'arsanymilad45+game_manager@gmail.com',  role: 'game_manager', full_name: 'Test Game Manager' },
];

for (const u of users) {
  // 1. Create auth user (email pre-confirmed, no confirmation email sent)
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: u.email,
    password: TEMP_PASSWORD,
    email_confirm: true,
  });

  if (authErr) {
    console.error(`❌  Auth create failed for ${u.email}:`, authErr.message);
    continue;
  }

  const userId = authData.user.id;

  // 2. Insert into public.users
  const { error: dbErr } = await supabase
    .from('users')
    .insert({ id: userId, email: u.email, full_name: u.full_name, role: u.role });

  if (dbErr) {
    console.error(`❌  DB insert failed for ${u.email}:`, dbErr.message);
  } else {
    console.log(`✅  ${u.role.padEnd(14)} ${u.email}`);
  }
}
