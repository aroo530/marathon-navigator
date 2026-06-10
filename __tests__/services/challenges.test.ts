import { makeChain, supabaseMock } from '../helpers/supabase';
import {
  canUserEditChallenge,
  canManageGames,
  formatTimeAgo,
  transformToRecentEntries,
  fetchMarathonChallenges,
  fetchMarathonFamilies,
} from '@/services/challenges';
import type { Challenge, GameScoreEntry } from '@/services/challenges';

// ── Pure functions ────────────────────────────────────────────────────────────

describe('canUserEditChallenge', () => {
  const base: Challenge = {
    id: 1, marathon_id: 1, title: 'Test', description: '',
    challenge_type: 'kahoot', game_type: null, points: 10,
    is_general: false, uses_percentage_based_scoring: false,
    is_active: true, created_at: '', editable_by_roles: ['admin', 'leader'],
  };

  it('returns false when userRole is null', () => {
    expect(canUserEditChallenge(base, null)).toBe(false);
  });

  it('returns false when role not in editable_by_roles', () => {
    expect(canUserEditChallenge(base, 'participant')).toBe(false);
  });

  it('returns true for admin regardless of assignment', () => {
    expect(canUserEditChallenge({ ...base, assigned_user_id: 'other-user' }, 'admin', 'me')).toBe(true);
  });

  it('returns true for leader on unassigned challenge', () => {
    expect(canUserEditChallenge(base, 'leader', 'user-1')).toBe(true);
  });

  it('returns true for leader when they are the assigned user', () => {
    expect(canUserEditChallenge({ ...base, assigned_user_id: 'user-1' }, 'leader', 'user-1')).toBe(true);
  });

  it('returns false for leader when a different user is assigned', () => {
    expect(canUserEditChallenge({ ...base, assigned_user_id: 'user-2' }, 'leader', 'user-1')).toBe(false);
  });
});

describe('canManageGames', () => {
  it('returns false for null/undefined role', () => {
    expect(canManageGames(null)).toBe(false);
    expect(canManageGames(undefined)).toBe(false);
  });

  it('returns true for admin', () => {
    expect(canManageGames('admin')).toBe(true);
  });

  it('returns true for game_manager', () => {
    expect(canManageGames('game_manager')).toBe(true);
  });

  it('returns false for leader', () => {
    expect(canManageGames('leader')).toBe(false);
  });
});

describe('formatTimeAgo', () => {
  function dateMinutesAgo(n: number) {
    return new Date(Date.now() - n * 60 * 1000).toISOString();
  }

  it('returns "now" for less than 1 minute ago', () => {
    expect(formatTimeAgo(dateMinutesAgo(0))).toBe('now');
  });

  it('returns minutes for less than 1 hour ago', () => {
    expect(formatTimeAgo(dateMinutesAgo(30))).toBe('30 min ago');
  });

  it('returns hours for less than 1 day ago', () => {
    expect(formatTimeAgo(dateMinutesAgo(90))).toBe('1 hr ago');
  });

  it('returns days for 2+ days ago', () => {
    expect(formatTimeAgo(dateMinutesAgo(60 * 48))).toBe('2 day ago');
  });
});

describe('transformToRecentEntries', () => {
  const entry: GameScoreEntry = {
    id: 7,
    family_id: 1,
    family_name: 'Wolves',
    challenge_id: 3,
    challenge_title: 'Kahoot',
    game_type: 'kahoot',
    points_awarded: 50,
    submitted_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    submitted_by: 'user-1',
  };

  it('maps entries to the RecentGameEntry shape', () => {
    const result = transformToRecentEntries([entry]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '7',
      family: 'Wolves',
      game: 'Kahoot',
      pts: 50,
    });
  });

  it('returns empty array for empty input', () => {
    expect(transformToRecentEntries([])).toEqual([]);
  });
});

// ── Supabase-backed functions ─────────────────────────────────────────────────

describe('fetchMarathonChallenges', () => {
  it('splits data into weekChallenges and generalChallenges', async () => {
    const weekId = 10;
    const data = [
      { id: 1, is_general: false, week_id: weekId, title: 'W1' },
      { id: 2, is_general: true,  week_id: null,   title: 'G1' },
      { id: 3, is_general: false, week_id: 99,     title: 'Other week' },
    ];
    supabaseMock.rpc.mockResolvedValue({ data, error: null });

    const result = await fetchMarathonChallenges(2, 5, weekId);

    expect(result.weekChallenges).toHaveLength(1);
    expect(result.weekChallenges[0].title).toBe('W1');
    expect(result.generalChallenges).toHaveLength(1);
    expect(result.generalChallenges[0].title).toBe('G1');
  });

  it('returns empty arrays when data is null', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    const result = await fetchMarathonChallenges(2, 5);
    expect(result).toEqual({ weekChallenges: [], generalChallenges: [] });
  });

  it('throws on RPC error', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    await expect(fetchMarathonChallenges(2, 5)).rejects.toEqual({ message: 'rpc failed' });
  });
});

describe('fetchMarathonFamilies', () => {
  it('counts participants per family into member_count', async () => {
    const familyRows = [
      { id: 1, name: 'Wolves', marathon_id: 2 },
      { id: 2, name: 'Hawks',  marathon_id: 2 },
    ];
    const userRows = [
      { family_id: 1 }, { family_id: 1 }, { family_id: 1 }, // 3 in Wolves
      { family_id: 2 },                                      // 1 in Hawks
    ];
    supabaseMock.from.mockImplementation((table: string) =>
      makeChain({ data: table === 'families' ? familyRows : userRows, error: null })
    );

    const result = await fetchMarathonFamilies(2);

    expect(result[0].member_count).toBe(3);
    expect(result[1].member_count).toBe(1);
  });

  it('defaults member_count to 0 for families with no participants', async () => {
    const familyRows = [{ id: 1, name: 'Wolves', marathon_id: 2 }];
    supabaseMock.from.mockImplementation((table: string) =>
      makeChain({ data: table === 'families' ? familyRows : [], error: null })
    );

    const result = await fetchMarathonFamilies(2);
    expect(result[0].member_count).toBe(0);
  });

  it('returns empty array when families data is null', async () => {
    supabaseMock.from.mockImplementation((table: string) =>
      makeChain({ data: table === 'families' ? null : [], error: null })
    );

    const result = await fetchMarathonFamilies(2);
    expect(result).toEqual([]);
  });
});
