import { supabase } from "../constants/supabaseClient";

export const fetchAvailableMarathons = async () => {
  const { data, error } = await supabase
    .from("marathon_with_family_count")
    .select("*");

  if (error) throw error;

  return data;
};
