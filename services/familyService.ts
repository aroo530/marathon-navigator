import { supabase } from "@/constants/supabaseClient";
import type { Family } from "../context/FamilyContext";

export const getCurrentFamily = async (marathonId: number): Promise<Family | null> => {

  // Commented out for testing

  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('marathon_id', marathonId)
    .single();

  if (error) {
    console.error('Error fetching current family:', error);
    return null;
  }

  return data;
};

export const getFamilyscoreBreakdownData = async (familyId: number, marathonId: number) => {
  const { data, error } = await supabase
    .rpc("get_family_score_breakdown", { input_family_id:familyId, input_marathon_id: marathonId });
  console.log('data', data);
  if (error) throw error;

  return data;
};
