// One-time script to create staff auth accounts.
// Run: node create-staff.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://asygijgyvplutjujdiic.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeWdpamd5dnBsdXRqdWpkaWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU4MzEzNywiZXhwIjoyMDk1MTU5MTM3fQ.zJy1w4Ziyy5cpTBpj9pNaqJzzFdI_MnGwvigolZ9s1o';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STAFF = [
  { email: 'nova@cod.com',       password: 'Nova@01',  full_name: 'Nova',        role: 'leader' },
  { email: 'marina@cod.com',     password: 'Mari@02',  full_name: 'Marina',      role: 'leader' },
  { email: 'fared_nemr@cod.com', password: 'Fare@03',  full_name: 'Fared Nemr',  role: 'leader' },
  { email: 'joseph@cod.com',     password: 'Jose@04',  full_name: 'Joseph',      role: 'leader' },
];

for (const user of STAFF) {
  const { data: auth, error: authErr } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  if (authErr) {
    console.error(`✗ ${user.email} — auth: ${authErr.message}`);
    continue;
  }

  const { error: dbErr } = await admin.from('users').insert({
    id: auth.user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  });

  if (dbErr) {
    console.error(`✗ ${user.email} — db: ${dbErr.message}`);
    await admin.auth.admin.deleteUser(auth.user.id); // roll back
    continue;
  }

  console.log(`✓ ${user.email}  password: ${user.password}  role: ${user.role}`);
}
