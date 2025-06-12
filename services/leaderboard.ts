import { supabase } from "../constants/supabaseClient";

export type ActivityLog = {
  source: string;
  challenge_id: number;
  challenge_title: string;
  week_id: number;
  week_number: number;
  family_id: number;
  family_name: string;
  points_awarded: number;
  submitted_at: string;
  submitted_by: string;
  submitted_by_name: string;
};
export const getLeaderboardData = async (marathonId: number) => {
  const { data, error } = await supabase
    .rpc("get_family_total_scores", { p_marathon_id: marathonId });
  if (error) throw error;

  return data;
};
export const getLeaderboardLogs = async (marathonId: number) => {
  const { data, error } = await supabase
    .rpc('get_all_families_scores', { input_marathon_id: marathonId });
  if (error) throw error;

  return data;
};
