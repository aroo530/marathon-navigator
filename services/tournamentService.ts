import { supabase } from "@/constants/supabaseClient";

// Types
export type TournamentMatch = {
    match_id: number;
    family1_id: number;
    family1_name: string;
    family2_id: number;
    family2_name: string;
    match_date: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    winner_family_id: number | null;
};

export type Tournament = {
    id: number;
    title: string;
    description: string;
    status: 'planned' | 'active' | 'completed';
    start_date: string;
    end_date: string;
    created_at: string;
    matches: TournamentMatch[];
};

/**
 * Fetches the current active tournament and its matches for the given marathon and week
 * The tournament data includes an array of matches for the specified week
 */
export const getCurrentTournament = async (
    marathonId: number,
    weekId: number
): Promise<Tournament | null> => {
    const { data, error } = await supabase
        .rpc('get_current_tournament_with_matches', {
            p_marathon_id: marathonId,
            p_week_id: weekId
        });
    if (error) {
        console.error('Error fetching tournament:', error);
        throw error;
    }
    console.log(data)
    return data || null;
};

/**
 * Updates a match result and awards points to the families
 * Only admins can call this function
 * Winner gets 30 points, loser gets 10 points
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const updateMatchResult = async (
    tournamentId: number,
    weekId: number,
    winnerFamilyId: number,
    loserFamilyId: number,
    submittedBy: string
): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await supabase
        .rpc('manage_tournament_matches', {
            p_tournament_id: tournamentId,
            p_week_id: weekId,
            p_winner_family_id: winnerFamilyId,
            p_loser_family_id: loserFamilyId,
            p_submitted_by: submittedBy
        });

    if (error) {
        console.error('Error updating match result:', error);
        throw error;
    }

    return data;
};

/**
 * Helper function to check if a user can update match results
 * Only admins can update match results
 */
export const canUpdateMatchResults = (userRole: string | null): boolean => {
    return userRole === 'admin';
}; 