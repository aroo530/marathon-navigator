import { supabase } from "@/constants/supabaseClient";

export type ScoringConfig = {
  id: number;
  challenge_id: number;
  min_percentage: number;
  max_percentage: number;
  points: number;
};

export async function fetchScoringConfig(challengeId: number): Promise<ScoringConfig[]> {
  const { data, error } = await supabase
    .from('scoring_configs')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('max_percentage', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function calculatePoints(configs: ScoringConfig[], percentage: number): number {
  const config = configs.find(
    (c) => percentage >= c.min_percentage && percentage <= c.max_percentage
  );
  return config?.points || 0;
}
