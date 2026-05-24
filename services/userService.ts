import { supabase } from '@/constants/supabaseClient';

export type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
};

// Define the Participant type based on your database schema
export type Participant = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
};

// Fetch all users with role = 'participant'
export async function fetchParticipantsByFamilyId(familyId: number): Promise<Participant[]> {
  let query = supabase.from('users').select('*').eq('role', 'participant');
  if (familyId !== undefined) {
    query = query.eq('family_id', familyId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching participants:', error.message);
    throw error;
  }
  return (data as Participant[]) || [];
}

// Create a new participant
export async function createParticipant(
  email: string,
  name: string,
  familyId: number
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .insert([
      {
        email,
        full_name: name,
        family_id: familyId,
        role: 'participant'
      }
    ]);

  if (error) {
    console.error('Error creating participant:', error.message);
    throw error;
  }
}

// Update an existing participant
export async function updateParticipant(
  id: number,
  updates: Partial<Omit<Participant, 'id' | 'role' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating participant:', error.message);
    throw error;
  }
}

// Delete a participant
export async function deleteParticipant(
  id: number
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting participant:', error.message);
    throw error;
  }
}
