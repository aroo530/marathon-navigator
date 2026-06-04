import { makeChain, supabaseMock } from '../helpers/supabase';
import {
  fetchAttendanceChallengeForWeek,
  fetchFamilyAttendanceStats,
  fetchMarathonRoster,
  resolveParticipantFromQR,
  recordAttendance,
  removeAttendance,
  type AttendanceRecord,
} from '@/services/attendanceService';

jest.mock('@/services/challenges', () => ({
  updateChallengeScore: jest.fn().mockResolvedValue(undefined),
}));

// ── fetchAttendanceChallengeForWeek ───────────────────────────────────────────

describe('fetchAttendanceChallengeForWeek', () => {
  it('returns null when no attendance challenge exists', async () => {
    supabaseMock.from.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await fetchAttendanceChallengeForWeek(2, 1);
    expect(result).toBeNull();
  });

  it('returns null when no week_challenge row exists for the week', async () => {
    supabaseMock.from
      .mockReturnValueOnce(makeChain({ data: [{ id: 19, points: 30 }], error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: null }));
    const result = await fetchAttendanceChallengeForWeek(2, 1);
    expect(result).toBeNull();
  });

  it('returns AttendanceChallenge when both rows exist', async () => {
    supabaseMock.from
      .mockReturnValueOnce(makeChain({ data: [{ id: 19, points: 30 }], error: null }))
      .mockReturnValueOnce(makeChain({ data: { id: 79 }, error: null }));
    const result = await fetchAttendanceChallengeForWeek(2, 1);
    expect(result).toEqual({ challengeId: 19, weekChallengeId: 79, maxPoints: 30 });
  });

  it('uses first row by id when multiple attendance challenges exist (duplicate resilience)', async () => {
    supabaseMock.from
      .mockReturnValueOnce(makeChain({ data: [{ id: 19, points: 30 }, { id: 32, points: 30 }], error: null }))
      .mockReturnValueOnce(makeChain({ data: { id: 79 }, error: null }));
    const result = await fetchAttendanceChallengeForWeek(2, 1);
    // Must use first row (id=19), not error
    expect(result?.challengeId).toBe(19);
  });
});

// ── fetchFamilyAttendanceStats ────────────────────────────────────────────────

describe('fetchFamilyAttendanceStats', () => {
  const families = [
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Bravo' },
  ];
  const participants = [
    { family_id: 1 }, { family_id: 1 }, { family_id: 1 }, // Alpha: 3 total
    { family_id: 2 }, { family_id: 2 },                   // Bravo: 2 total
  ];

  it('computes present counts from the passed attendees, not from a DB query', async () => {
    supabaseMock.from
      .mockReturnValueOnce(makeChain({ data: families, error: null }))
      .mockReturnValueOnce(makeChain({ data: participants, error: null }));

    const attendees: AttendanceRecord[] = [
      { id: 1, participant_id: 'p1', participant_name: 'A', family_id: 1, family_name: 'Alpha', scanned_at: '' },
      { id: 2, participant_id: 'p2', participant_name: 'B', family_id: 1, family_name: 'Alpha', scanned_at: '' },
    ];

    const result = await fetchFamilyAttendanceStats(2, attendees);
    expect(result).toEqual([
      { familyId: 1, familyName: 'Alpha', present: 2, total: 3 },
      { familyId: 2, familyName: 'Bravo', present: 0, total: 2 },
    ]);
  });

  it('returns [] when families query returns null', async () => {
    supabaseMock.from
      .mockReturnValueOnce(makeChain({ data: null, error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }));
    const result = await fetchFamilyAttendanceStats(2, []);
    expect(result).toEqual([]);
  });
});

// ── fetchMarathonRoster ───────────────────────────────────────────────────────

describe('fetchMarathonRoster', () => {
  it('returns [] when there are no families', async () => {
    supabaseMock.from.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await fetchMarathonRoster(2);
    expect(result).toEqual([]);
  });

  it('joins family name onto each participant', async () => {
    supabaseMock.from
      .mockReturnValueOnce(makeChain({ data: [{ id: 14, name: 'Rangers' }], error: null }))
      .mockReturnValueOnce(makeChain({
        data: [
          { id: 'u1', full_name: 'Alice', family_id: 14 },
          { id: 'u2', full_name: 'Bob',   family_id: 14 },
        ],
        error: null,
      }));
    const result = await fetchMarathonRoster(2);
    expect(result).toEqual([
      { id: 'u1', full_name: 'Alice', family_id: 14, family_name: 'Rangers' },
      { id: 'u2', full_name: 'Bob',   family_id: 14, family_name: 'Rangers' },
    ]);
  });

  it('throws when participant query errors', async () => {
    supabaseMock.from
      .mockReturnValueOnce(makeChain({ data: [{ id: 1, name: 'X' }], error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchMarathonRoster(2)).rejects.toEqual({ message: 'DB error' });
  });
});

// ── resolveParticipantFromQR ──────────────────────────────────────────────────

describe('resolveParticipantFromQR', () => {
  it('returns invalid for non-JSON input', async () => {
    const result = await resolveParticipantFromQR('not-json');
    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('returns invalid when pid field is missing', async () => {
    const result = await resolveParticipantFromQR(JSON.stringify({ name: 'Alice' }));
    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('returns not_found when user does not exist', async () => {
    supabaseMock.from.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await resolveParticipantFromQR(JSON.stringify({ pid: 'u1' }));
    expect(result).toEqual({ ok: false, error: 'not_found' });
  });

  it('returns no_family when user has no family_id', async () => {
    supabaseMock.from.mockReturnValue(
      makeChain({ data: { id: 'u1', full_name: 'Alice', family_id: null }, error: null })
    );
    const result = await resolveParticipantFromQR(JSON.stringify({ pid: 'u1' }));
    expect(result).toEqual({ ok: false, error: 'no_family' });
  });

  it('returns ok result with name and familyId', async () => {
    supabaseMock.from.mockReturnValue(
      makeChain({ data: { id: 'u1', full_name: 'Alice', family_id: 14 }, error: null })
    );
    const result = await resolveParticipantFromQR(JSON.stringify({ pid: 'u1' }));
    expect(result).toEqual({ ok: true, id: 'u1', name: 'Alice', familyId: 14 });
  });
});

// ── recordAttendance ──────────────────────────────────────────────────────────

describe('recordAttendance', () => {
  it('returns alreadyRecorded=true on unique-constraint violation', async () => {
    supabaseMock.from.mockReturnValue(makeChain({ data: null, error: { code: '23505' } }));
    const result = await recordAttendance('u1', 1, 2, 14, 'admin', null);
    expect(result).toEqual({ alreadyRecorded: true });
  });

  it('throws on non-duplicate DB error', async () => {
    supabaseMock.from.mockReturnValue(makeChain({ data: null, error: { code: '42501', message: 'denied' } }));
    await expect(recordAttendance('u1', 1, 2, 14, 'admin', null)).rejects.toMatchObject({ code: '42501' });
  });

  it('returns alreadyRecorded=false on success with no challenge', async () => {
    supabaseMock.from.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await recordAttendance('u1', 1, 2, 14, 'admin', null);
    expect(result).toEqual({ alreadyRecorded: false });
  });
});

// ── removeAttendance ──────────────────────────────────────────────────────────

describe('removeAttendance', () => {
  it('throws on DB error', async () => {
    supabaseMock.from.mockReturnValue(makeChain({ data: null, error: { message: 'fail' } }));
    await expect(removeAttendance('u1', 1, 14, null)).rejects.toEqual({ message: 'fail' });
  });

  it('resolves without error on success', async () => {
    supabaseMock.from.mockReturnValue(makeChain({ data: null, error: null }));
    await expect(removeAttendance('u1', 1, 14, null)).resolves.toBeUndefined();
  });
});
