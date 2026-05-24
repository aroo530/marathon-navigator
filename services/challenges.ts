import { supabase } from "@/constants/supabaseClient";

export type Challenge = {
    id: number;
    marathon_id: number;
    title: string;
    description: string;
    challenge_type: 'kahoot' | 'project' | 'attendance' | 'activity' | 'game' | 'tournament' | 'confession';
    game_type: string | null;
    points: number;
    is_general: boolean;
    uses_percentage_based_scoring: boolean;
    is_active: boolean;
    created_at: string;
    editable_by_roles: string[];  // Array of role names that can edit this challenge
    week_challenge_id?: number;  // ID from the week_challenges table
    points_awarded?: number,
    percentage_score?: number,

};

export type ChallengeWithProgress = Challenge & {
    id: number;
    family_id: number;
    week_challenge_id: number;
    points_awarded: number;
    percentage_score: number | null;
    notes: string | null;
    submitted_by: string | null;
    submitted_at: string;
    score?: {
        points: number;
        percentage?: number;
    };
};

export type GameChallenge = {
    id: number;
    title: string;
    game_type: string;
    points: number;
    marathon_id: number;
    is_active: boolean;
};

export type Family = {
    id: number;
    name: string;
    marathon_id: number;
    avatar_url?: string;
    cover_url?: string;
};

export type GameScoreEntry = {
    id: number;
    family_id: number;
    family_name: string;
    challenge_id: number;
    challenge_title: string;
    game_type: string;
    points_awarded: number;
    submitted_at: string;
    submitted_by: string;
    notes?: string;
};

export type RecentGameEntry = {
    id: string;
    family: string;
    game: string;
    pts: number;
    ago: string;
    icon?: string;
    iconColor?: string;
};

// Existing functions
export const fetchMarathonChallenges = async (
    marathonId: number,
    familyId: number,
    weekId?: number
): Promise<{
    weekChallenges: ChallengeWithProgress[];
    generalChallenges: ChallengeWithProgress[];
}> => {
    const { data, error } = await supabase
        .rpc('get_family_challenges', {
            p_marathon_id: marathonId,
            p_family_id: familyId,
            p_week_id: weekId || null
        });
    if (error) {
        console.error('Error fetching challenges:', error);
        throw error;
    }

    if (!data) {
        return {
            weekChallenges: [],
            generalChallenges: []
        };
    }

    const weekChallenges = data.filter((ch: ChallengeWithProgress & { week_id: number }) => !ch.is_general && ch.week_id === weekId);
    const generalChallenges = data.filter((ch: ChallengeWithProgress & { week_id: number }) => ch.is_general);

    return {
        weekChallenges,
        generalChallenges
    };
};

export const updateChallengeScore = async (
    familyId: number,
    pointsAwarded: number,
    percentageScore?: number,
    weekChallengeId?: number,
    challengeId?: number,
): Promise<void> => {
    const { data, error } = await supabase
        .rpc('upsert_family_score', {
            p_family_id: familyId,
            p_week_challenge_id: weekChallengeId,  // null for general
            p_challenge_id: challengeId,
            p_points_awarded: pointsAwarded,
            p_percentage_score: percentageScore,  // or null for non-percentage
        });

    if (error) {
        console.error('Error updating challenge score:', error);
        throw error;
    }
};

export const canUserEditChallenge = (challenge: Challenge, userRole?: string | null): boolean => {
    if (!userRole || !challenge.editable_by_roles) return false;
    return challenge.editable_by_roles.includes(userRole);
};

// New Game-specific functions

/**
 * Fetch all active game challenges for a specific marathon
 */
export const fetchGameChallenges = async (marathonId: number): Promise<GameChallenge[]> => {
    const { data, error } = await supabase
        .from('challenges')
        .select('id, title, game_type, points, marathon_id, is_active')
        .eq('marathon_id', marathonId)
        .eq('challenge_type', 'game')
        .eq('is_active', true)
        .order('title');

    if (error) {
        console.error('Error fetching game challenges:', error);
        throw error;
    }

    return data || [];
};

/**
 * Fetch all families for a specific marathon
 */
export const fetchMarathonFamilies = async (marathonId: number): Promise<Family[]> => {
    const { data, error } = await supabase
        .from('families')
        .select('id, name, marathon_id, avatar_url, cover_url')
        .eq('marathon_id', marathonId)
        .order('name');

    if (error) {
        console.error('Error fetching families:', error);
        throw error;
    }

    return data || [];
};

/**
 * Add a game score for a family using direct API call
 */
export const addGameScore = async (
    familyId: number,
    challengeId: number,
    pointsAwarded: number,
    submittedBy: string,
    notes?: string
): Promise<void> => {
    const { error } = await supabase
        .from('family_scores')
        .insert({
            family_id: familyId,
            challenge_id: challengeId,
            points_awarded: pointsAwarded,
            submitted_by: submittedBy,
            notes: notes,
            submitted_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error adding game score:', error);
        throw error;
    }
};

/**
 * Fetch recent game entries using RPC for complex query with joins
 */
export const fetchRecentGameEntries = async (
    marathonId: number,
    limit: number = 10
): Promise<GameScoreEntry[]> => {
    const { data, error } = await supabase
        .rpc('get_recent_game_entries', {
            p_marathon_id: marathonId,
            p_limit: limit
        });

    if (error) {
        console.error('Error fetching recent game entries:', error);
        throw error;
    }

    return data || [];
};

/**
 * Alternative: Fetch recent game entries using direct API with joins
 */
export const fetchRecentGameEntriesAPI = async (
    marathonId: number,
    limit: number = 10
): Promise<GameScoreEntry[]> => {
    const { data, error } = await supabase
        .from('family_scores')
        .select(`
            id,
            family_id,
            challenge_id,
            points_awarded,
            submitted_at,
            submitted_by,
            notes,
            families!inner(
                id,
                name,
                marathon_id
            ),
            challenges!inner(
                id,
                title,
                game_type,
                challenge_type
            )
        `)
        .eq('families.marathon_id', marathonId)
        .eq('challenges.challenge_type', 'game')
        .order('submitted_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching recent game entries via API:', error);
        throw error;
    }

    if (!data) return [];

    // Transform the nested data structure
    return data.map(entry => ({
        id: entry.id,
        family_id: entry.family_id,
        family_name: (entry.families as any).name,
        challenge_id: entry.challenge_id,
        challenge_title: (entry.challenges as any).title,
        game_type: (entry.challenges as any).game_type || '',
        points_awarded: entry.points_awarded,
        submitted_at: entry.submitted_at,
        submitted_by: entry.submitted_by || '',
        notes: entry.notes || undefined
    }));
};

/**
 * Get family leaderboard for games
 */
export const getGameLeaderboard = async (marathonId: number): Promise<{
    family_id: number;
    family_name: string;
    total_points: number;
    game_count: number;
}[]> => {
    const { data, error } = await supabase
        .rpc('get_game_leaderboard', {
            p_marathon_id: marathonId
        });

    if (error) {
        console.error('Error fetching game leaderboard:', error);
        throw error;
    }

    return data || [];
};

/**
 * Get detailed game statistics for a family
 */
export const getFamilyGameStats = async (
    familyId: number,
    marathonId: number
): Promise<{
    total_points: number;
    games_played: number;
    average_score: number;
    best_game: string | null;
    best_score: number;
}> => {
    const { data, error } = await supabase
        .rpc('get_family_game_stats', {
            p_family_id: familyId,
            p_marathon_id: marathonId
        });

    if (error) {
        console.error('Error fetching family game stats:', error);
        throw error;
    }

    return data?.[0] || {
        total_points: 0,
        games_played: 0,
        average_score: 0,
        best_game: null,
        best_score: 0
    };
};

/**
 * Delete a game score entry (for corrections)
 */
export const deleteGameScore = async (scoreId: number): Promise<void> => {
    const { error } = await supabase
        .from('family_scores')
        .delete()
        .eq('id', scoreId);

    if (error) {
        console.error('Error deleting game score:', error);
        throw error;
    }
};

/**
 * Update an existing game score entry
 */
export const updateGameScore = async (
    scoreId: number,
    pointsAwarded: number,
    notes?: string
): Promise<void> => {
    const { error } = await supabase
        .from('family_scores')
        .update({
            points_awarded: pointsAwarded,
            notes: notes,
            submitted_at: new Date().toISOString()
        })
        .eq('id', scoreId);

    if (error) {
        console.error('Error updating game score:', error);
        throw error;
    }
};

/**
 * Check if user has permission to manage games
 */
export const canManageGames = (userRole?: string | null): boolean => {
    if (!userRole) return false;
    return ['admin', 'game_manager'].includes(userRole);
};

/**
 * Format time ago helper function
 */
export const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr ago`;
    return `${Math.floor(diffInMinutes / 1440)} day ago`;
};

/**
 * Transform game entries to recent entries format for UI
 */
export const transformToRecentEntries = (
    entries: GameScoreEntry[],
): RecentGameEntry[] => {
    return entries.map(entry => ({
        id: entry.id.toString(),
        family: entry.family_name,
        game: entry.challenge_title,
        pts: entry.points_awarded,
        ago: formatTimeAgo(entry.submitted_at),
    }));
};

/**
 * Get existing score for a family and challenge
 */
export const getExistingScore = async (
    marathonId: number,
    familyId: number,
    challengeId: number
): Promise<GameScoreEntry | null> => {
    const { data, error } = await supabase
        .from('family_scores')
        .select(`
            id,
            family_id,
            challenge_id,
            points_awarded,
            submitted_at,
            submitted_by,
            notes,
            families!inner(
                id,
                name,
                marathon_id
            ),
            challenges!inner(
                id,
                title,
                game_type,
                challenge_type
            )
        `)
        .eq('families.marathon_id', marathonId)
        .eq('family_id', familyId)
        .eq('challenge_id', challengeId)
        .eq('challenges.challenge_type', 'game')
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No rows returned
            return null;
        }
        console.error('Error fetching existing score:', error);
        throw error;
    }

    if (!data) return null;

    return {
        id: data.id,
        family_id: data.family_id,
        family_name: (data.families as any).name,
        challenge_id: data.challenge_id,
        challenge_title: (data.challenges as any).title,
        game_type: (data.challenges as any).game_type || '',
        points_awarded: data.points_awarded,
        submitted_at: data.submitted_at,
        submitted_by: data.submitted_by || '',
        notes: data.notes || undefined
    };
};

export const deleteChallengeScore = async (
    familyId: number,
    weekChallengeId?: number,
    challengeId?: number,
): Promise<void> => {
    const { error } = await supabase
        .from('family_scores')
        .delete()
        .match({
            family_id: familyId,
            week_challenge_id: weekChallengeId, // or null
            challenge_id: challengeId,
        })
    if (error) {
        console.error('Error deleting challenge score:', error);
        throw error;
    }
};
