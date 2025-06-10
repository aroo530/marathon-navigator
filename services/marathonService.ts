import { supabase } from "../constants/supabaseClient";

export const fetchAvailableMarathons = async () => {
  const { data, error } = await supabase
    .from("marathon_with_family_count")
    .select("*");

  if (error) throw error;

  return data;
};

export const fetchWeeksByMarathonId = async (marathonId: number) => {
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .eq("marathon_id", marathonId)
    .order("week_number", { ascending: true }); // optional ordering

  if (error) throw error;

  return data;
};
