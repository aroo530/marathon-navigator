import { supabase } from '@/constants/supabaseClient';
import { updateChallengeScore } from './challenges';

export type AttendanceRecord = {
  id: number;
  participant_id: string;
  participant_name: string;
  family_id: number;
  family_name: string;
  scanned_at: string;
};

export type FamilyAttendanceStat = {
  familyId: number;
  familyName: string;
  present: number;
  total: number;
};

export type AttendanceChallenge = {
  challengeId: number;
  weekChallengeId: number;
  maxPoints: number;
};

export type QRResolveResult =
  | { ok: true; id: string; name: string; familyId: number }
  | { ok: false; error: 'invalid' | 'not_found' | 'no_family' };

export async function fetchAttendanceChallengeForWeek(
  marathonId: number,
  weekId: number,
): Promise<AttendanceChallenge | null> {
  const { data: ch } = await supabase
    .from('challenges')
    .select('id, points')
    .eq('marathon_id', marathonId)
    .eq('challenge_type', 'attendance')
    .is('game_type', null)
    .maybeSingle();

  if (!ch) return null;

  const { data: wc } = await supabase
    .from('week_challenges')
    .select('id')
    .eq('week_id', weekId)
    .eq('challenge_id', ch.id)
    .maybeSingle();

  if (!wc) return null;

  return { challengeId: ch.id, weekChallengeId: wc.id, maxPoints: ch.points };
}

export async function fetchWeekAttendance(
  weekId: number,
  marathonId: number,
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, participant_id, family_id, scanned_at, users(full_name), families(name)')
    .eq('week_id', weekId)
    .eq('marathon_id', marathonId)
    .order('family_id', { ascending: true })
    .order('scanned_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    participant_id: row.participant_id,
    participant_name: row.users?.full_name ?? 'Unknown',
    family_id: row.family_id,
    family_name: row.families?.name ?? '',
    scanned_at: row.scanned_at,
  }));
}

export async function fetchFamilyAttendanceStats(
  weekId: number,
  marathonId: number,
): Promise<FamilyAttendanceStat[]> {
  const { data: families } = await supabase
    .from('families')
    .select('id, name')
    .eq('marathon_id', marathonId)
    .order('name');

  if (!families || families.length === 0) return [];

  const stats = await Promise.all(
    families.map(async (f) => {
      const [{ count: present }, { count: total }] = await Promise.all([
        supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('week_id', weekId)
          .eq('family_id', f.id),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', f.id)
          .eq('role', 'participant'),
      ]);
      return {
        familyId: f.id,
        familyName: f.name,
        present: present ?? 0,
        total: total ?? 0,
      };
    })
  );

  return stats;
}

export async function refreshFamilyScore(
  weekId: number,
  familyId: number,
  ac: AttendanceChallenge,
): Promise<void> {
  return refreshAttendanceScore(weekId, familyId, ac);
}

async function refreshAttendanceScore(
  weekId: number,
  familyId: number,
  ac: AttendanceChallenge,
): Promise<void> {
  const [{ count: present }, { count: total }] = await Promise.all([
    supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('week_id', weekId)
      .eq('family_id', familyId),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', familyId)
      .eq('role', 'participant'),
  ]);

  if (!total || total === 0) return;

  const percentage = ((present ?? 0) / total) * 100;
  await updateChallengeScore(familyId, ac.maxPoints, percentage, ac.weekChallengeId, ac.challengeId);
}

export async function resolveParticipantFromQR(
  qrData: string,
): Promise<QRResolveResult> {
  let pid: string;
  try {
    const parsed = JSON.parse(qrData);
    pid = parsed.pid;
    if (!pid || typeof pid !== 'string') throw new Error();
  } catch {
    return { ok: false, error: 'invalid' };
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, family_id')
    .eq('id', pid)
    .maybeSingle();

  if (error || !data) return { ok: false, error: 'not_found' };
  if (!data.family_id) return { ok: false, error: 'no_family' };

  return { ok: true, id: data.id, name: data.full_name ?? 'Unknown', familyId: data.family_id };
}

export async function recordAttendance(
  participantId: string,
  weekId: number,
  marathonId: number,
  familyId: number,
  scannedBy: string,
  ac: AttendanceChallenge | null,
  opts?: { skipScoreRefresh?: boolean },
): Promise<{ alreadyRecorded: boolean }> {
  const { error } = await supabase.from('attendance').insert({
    participant_id: participantId,
    week_id: weekId,
    marathon_id: marathonId,
    family_id: familyId,
    scanned_by: scannedBy,
  });

  if (error) {
    if (error.code === '23505') return { alreadyRecorded: true };
    throw error;
  }

  if (ac && !opts?.skipScoreRefresh) await refreshAttendanceScore(weekId, familyId, ac);
  return { alreadyRecorded: false };
}

export async function removeAttendance(
  participantId: string,
  weekId: number,
  familyId: number,
  ac: AttendanceChallenge | null,
): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('participant_id', participantId)
    .eq('week_id', weekId);

  if (error) throw error;
  if (ac) await refreshAttendanceScore(weekId, familyId, ac);
}
