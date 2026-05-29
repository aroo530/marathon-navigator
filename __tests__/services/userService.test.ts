import { makeChain, supabaseMock } from '../helpers/supabase';
import {
  getUserProfile,
  fetchParticipantsByFamilyId,
  createParticipant,
  updateParticipant,
  deleteParticipant,
} from '@/services/userService';

const USER_ID   = 'user-uuid-abc';
const FAMILY_ID = 3;

describe('getUserProfile', () => {
  it('returns the user profile', async () => {
    const profile = { id: USER_ID, full_name: 'Arsany', role: 'admin' };
    const chain = makeChain({ data: profile, error: null });
    supabaseMock.from.mockReturnValue(chain);

    const result = await getUserProfile(USER_ID);

    expect(supabaseMock.from).toHaveBeenCalledWith('users');
    expect(chain.eq).toHaveBeenCalledWith('id', USER_ID);
    expect(chain.single).toHaveBeenCalled();
    expect(result).toEqual(profile);
  });

  it('returns null on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'not found' } });
    supabaseMock.from.mockReturnValue(chain);

    const result = await getUserProfile(USER_ID);
    expect(result).toBeNull();
  });
});

describe('fetchParticipantsByFamilyId', () => {
  it('returns participants filtered by family', async () => {
    const rows = [{ id: 1, full_name: 'Alice', role: 'participant' }];
    const chain = makeChain({ data: rows, error: null });
    supabaseMock.from.mockReturnValue(chain);

    const result = await fetchParticipantsByFamilyId(FAMILY_ID);

    expect(chain.eq).toHaveBeenCalledWith('role', 'participant');
    expect(chain.eq).toHaveBeenCalledWith('family_id', FAMILY_ID);
    expect(result).toEqual(rows);
  });

  it('returns empty array when data is null', async () => {
    const chain = makeChain({ data: null, error: null });
    supabaseMock.from.mockReturnValue(chain);

    const result = await fetchParticipantsByFamilyId(FAMILY_ID);
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    supabaseMock.from.mockReturnValue(chain);

    await expect(fetchParticipantsByFamilyId(FAMILY_ID)).rejects.toBeDefined();
  });
});

describe('createParticipant', () => {
  it('calls insert with correct payload', async () => {
    const chain = makeChain({ data: null, error: null });
    supabaseMock.from.mockReturnValue(chain);

    await createParticipant('alice@test.com', 'Alice', FAMILY_ID);

    expect(chain.insert).toHaveBeenCalledWith([{
      email: 'alice@test.com',
      full_name: 'Alice',
      family_id: FAMILY_ID,
      role: 'participant',
    }]);
  });

  it('throws on insert error', async () => {
    const chain = makeChain({ data: null, error: { message: 'constraint violation' } });
    supabaseMock.from.mockReturnValue(chain);

    await expect(createParticipant('x@x.com', 'X', FAMILY_ID)).rejects.toBeDefined();
  });
});

describe('updateParticipant', () => {
  it('calls update with correct id filter', async () => {
    const chain = makeChain({ data: null, error: null });
    supabaseMock.from.mockReturnValue(chain);

    await updateParticipant(1, { full_name: 'Bob' });

    expect(chain.update).toHaveBeenCalledWith({ full_name: 'Bob' });
    expect(chain.eq).toHaveBeenCalledWith('id', 1);
  });
});

describe('deleteParticipant', () => {
  it('calls delete with correct id filter', async () => {
    const chain = makeChain({ data: null, error: null });
    supabaseMock.from.mockReturnValue(chain);

    await deleteParticipant(1);

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 1);
  });
});
