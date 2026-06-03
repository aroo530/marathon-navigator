import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Session-scoped client — used for all normal operations
export const supabase = createClient(url, anonKey);

// Service-role client — used only for creating auth users (admin.createUser)
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function phoneToEmail(phone) {
  return `${phone.replace(/\D/g, "")}@marathonnavigator.app`;
}
