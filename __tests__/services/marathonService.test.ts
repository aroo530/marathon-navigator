import { makeChain, supabaseMock } from '../helpers/supabase';
import { fetchAvailableMarathons, fetchWeeksByMarathonId } from '@/services/marathonService';

describe('fetchAvailableMarathons', () => {
  it('returns non-completed marathons ordered by id desc', async () => {
    const rows = [{ id: 2, title: 'Spring Run' }, { id: 1, title: 'Winter Run' }];
    const chain = makeChain({ data: rows, error: null });
    supabaseMock.from.mockReturnValue(chain);

    const result = await fetchAvailableMarathons();

    expect(supabaseMock.from).toHaveBeenCalledWith('marathon_with_family_count');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.neq).toHaveBeenCalledWith('status', 'completed');
    expect(chain.order).toHaveBeenCalledWith('id', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('throws on Supabase error', async () => {
    const chain = makeChain({ data: null, error: { message: 'not found' } });
    supabaseMock.from.mockReturnValue(chain);

    await expect(fetchAvailableMarathons()).rejects.toEqual({ message: 'not found' });
  });
});

describe('fetchWeeksByMarathonId', () => {
  it('returns weeks for a marathon ordered by week_number asc', async () => {
    const rows = [{ id: 1, week_number: 1 }, { id: 2, week_number: 2 }];
    const chain = makeChain({ data: rows, error: null });
    supabaseMock.from.mockReturnValue(chain);

    const result = await fetchWeeksByMarathonId(2);

    expect(supabaseMock.from).toHaveBeenCalledWith('weeks');
    expect(chain.eq).toHaveBeenCalledWith('marathon_id', 2);
    expect(chain.order).toHaveBeenCalledWith('week_number', { ascending: true });
    expect(result).toEqual(rows);
  });

  it('throws on Supabase error', async () => {
    const chain = makeChain({ data: null, error: { message: 'DB down' } });
    supabaseMock.from.mockReturnValue(chain);

    await expect(fetchWeeksByMarathonId(2)).rejects.toEqual({ message: 'DB down' });
  });
});
