import { supabaseMock } from '../helpers/supabase';
import { getLeaderboardData, getLeaderboardLogs } from '@/services/leaderboard';

const MARATHON_ID = 2;

describe('getLeaderboardData', () => {
  it('returns data from the RPC', async () => {
    const rows = [{ family_id: 1, family_name: 'Wolves', total_points: 120 }];
    supabaseMock.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await getLeaderboardData(MARATHON_ID);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_family_total_scores', {
      p_marathon_id: MARATHON_ID,
    });
    expect(result).toEqual(rows);
  });

  it('throws when Supabase returns an error', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await expect(getLeaderboardData(MARATHON_ID)).rejects.toEqual({ message: 'DB error' });
  });
});

describe('getLeaderboardLogs', () => {
  it('returns activity log rows from the RPC', async () => {
    const rows = [{ family_name: 'Wolves', points_awarded: 50 }];
    supabaseMock.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await getLeaderboardLogs(MARATHON_ID);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_all_families_scores', {
      input_marathon_id: MARATHON_ID,
    });
    expect(result).toEqual(rows);
  });

  it('throws when Supabase returns an error', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'timeout' } });

    await expect(getLeaderboardLogs(MARATHON_ID)).rejects.toEqual({ message: 'timeout' });
  });
});
