import { supabaseMock } from '../helpers/supabase';
import { getCurrentFamily, getFamilyscoreBreakdownData } from '@/services/familyService';

const USER_ID  = 'user-uuid-123';
const MARATHON = 2;
const FAMILY_ID = 5;

describe('getCurrentFamily', () => {
  it('returns the first family from the RPC', async () => {
    const family = { id: FAMILY_ID, name: 'Wolves', member_count: 10 };
    supabaseMock.rpc.mockResolvedValue({ data: [family], error: null });

    const result = await getCurrentFamily(MARATHON, USER_ID);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_current_family_with_count', {
      p_user_id: USER_ID,
      p_marathon_id: MARATHON,
    });
    expect(result).toEqual(family);
  });

  it('returns null when user has no family', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

    const result = await getCurrentFamily(MARATHON, USER_ID);
    expect(result).toBeUndefined(); // data[0] of empty array
  });

  it('returns null and does not throw on Supabase error', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

    const result = await getCurrentFamily(MARATHON, USER_ID);
    expect(result).toBeNull();
  });
});

describe('getFamilyscoreBreakdownData', () => {
  it('returns breakdown rows from the RPC', async () => {
    const rows = [{ source: 'challenge', points_awarded: 30 }];
    supabaseMock.rpc.mockResolvedValue({ data: rows, error: null });

    const result = await getFamilyscoreBreakdownData(FAMILY_ID, MARATHON);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_family_score_breakdown', {
      input_family_id: FAMILY_ID,
      input_marathon_id: MARATHON,
    });
    expect(result).toEqual(rows);
  });

  it('throws on Supabase error', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'error' } });

    await expect(getFamilyscoreBreakdownData(FAMILY_ID, MARATHON)).rejects.toEqual({
      message: 'error',
    });
  });
});
