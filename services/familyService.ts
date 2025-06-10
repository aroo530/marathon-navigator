import { supabase } from "@/constants/supabaseClient";
import type { Family } from "../context/FamilyContext";

export const getCurrentFamily = async (marathonId: number, userId: string): Promise<Family | null> => {

  const { data, error } = await supabase.rpc('get_current_family_with_count', { p_user_id: userId, p_marathon_id: marathonId })
  if (error) {
    console.error('Error fetching current family:', error);
    return null;
  }

  return data[0];
};

export const getFamilyscoreBreakdownData = async (familyId: number, marathonId: number) => {
  const { data, error } = await supabase
    .rpc("get_family_score_breakdown", { input_family_id: familyId, input_marathon_id: marathonId });
  if (error) throw error;

  return data;
};
