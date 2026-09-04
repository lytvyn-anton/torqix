import { supabase } from '../../../shared/api/supabase';
import { getActiveProgram, getPrograms } from './programsApi';

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

// Builds the same select().eq().eq().order() chain getPrograms calls, resolving to
// `result`, and returns the individual spies so callers can assert on how it was invoked.
function mockProgramsQuery(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const eqTemplate = jest.fn().mockReturnValue({ order });
  const eqUser = jest.fn().mockReturnValue({ eq: eqTemplate });
  const select = jest.fn().mockReturnValue({ eq: eqUser });
  mockedFrom.mockReturnValue({ select } as never);
  return { select, eqUser, eqTemplate, order };
}

describe('getPrograms', () => {
  it("queries the user's own non-template programs, newest first", async () => {
    const { select, eqUser, eqTemplate, order } = mockProgramsQuery({
      data: [
        { id: 'program-1', name: 'Push / Pull / Legs', status: 'active', created_at: '2026-09-01' },
      ],
      error: null,
    });

    const result = await getPrograms('user-1');

    expect(mockedFrom).toHaveBeenCalledWith('workout_programs');
    expect(select).toHaveBeenCalledWith('id, name, status, created_at');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqTemplate).toHaveBeenCalledWith('is_template', false);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual([
      { id: 'program-1', name: 'Push / Pull / Legs', status: 'active', createdAt: '2026-09-01' },
    ]);
  });

  it('returns an empty list when the user has no programs', async () => {
    mockProgramsQuery({ data: [], error: null });

    expect(await getPrograms('user-1')).toEqual([]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    mockProgramsQuery({ data: null, error });

    await expect(getPrograms('user-1')).rejects.toBe(error);
  });
});
