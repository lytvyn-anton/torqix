import { supabase } from '../../../shared/api/supabase';
import { getActiveProgram } from './programsApi';

jest.mock('../../../shared/api/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedFrom = jest.mocked(supabase.from);

// Builds the same select().eq().eq().order().limit().maybeSingle() chain getActiveProgram
// calls, resolving to `result`, and returns the individual spies so callers can assert on
// how the chain was invoked.
function mockActiveProgramQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const limit = jest.fn().mockReturnValue({ maybeSingle });
  const order = jest.fn().mockReturnValue({ limit });
  const eqStatus = jest.fn().mockReturnValue({ order });
  const eqUser = jest.fn().mockReturnValue({ eq: eqStatus });
  const select = jest.fn().mockReturnValue({ eq: eqUser });
  mockedFrom.mockReturnValue({ select } as never);
  return { select, eqUser, eqStatus, order, limit };
}

describe('getActiveProgram', () => {
  it("queries the user's most recent active, non-template program", async () => {
    const { select, eqUser, eqStatus, order, limit } = mockActiveProgramQuery({
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
      error: null,
    });

    const result = await getActiveProgram('user-1');

    expect(mockedFrom).toHaveBeenCalledWith('workout_programs');
    expect(select).toHaveBeenCalledWith('id, name');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'active');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 'program-1', name: 'Push / Pull / Legs' });
  });

  it('returns null when the user has no active program', async () => {
    mockActiveProgramQuery({ data: null, error: null });

    expect(await getActiveProgram('user-1')).toBeNull();
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    mockActiveProgramQuery({ data: null, error });

    await expect(getActiveProgram('user-1')).rejects.toBe(error);
  });
});
