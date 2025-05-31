import { supabase } from "../constants/supabaseClient";

export const getLeaderboardData = async (marathonId: number) => {
  const { data, error } = await supabase
    .rpc("get_family_total_scores", { marathon_id: marathonId });

  if (error) throw error;

  return data;
};
