import { supabase } from "@/constants/supabaseClient";

export type Challenge = {
    id: number;
    marathon_id: number;
    title: string;
    description: string;
    challenge_type: 'kahoot' | 'project' | 'attendance' | 'activity' | 'game' | 'tournament';
    game_type: string | null;
    points: number;
    is_general: boolean;
    uses_percentage_based_scoring: boolean;
    is_active: boolean;
    created_at: string;
    week_challenge_id?: number;  // ID from the week_challenges table
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

};

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
    console.log("Updating challenge score", familyId, weekChallengeId, challengeId, pointsAwarded, percentageScore);
    const { error } = await supabase
        .from('family_scores')
        .upsert({
            family_id: familyId,
            week_challenge_id: weekChallengeId,
            challenge_id: challengeId,
            points_awarded: pointsAwarded,
            percentage_score: percentageScore,
            submitted_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error updating challenge score:', error);
        throw error;
    }
};
