import { supabase } from '../../../shared/api/supabase';
import { createProgram, getActiveProgram, getPrograms } from './programsApi';

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

// Builds the mocked chains for createProgram's three sequential writes: workout_programs
// insert().select().single() (program), program_days insert() (days), and workout_programs
// update().eq().eq().neq() (archiving other active programs) — plus the
// workout_programs delete().eq() used to clean up if the days insert fails.
function mockCreateProgramFlow({
  programResult,
  daysResult = { error: null },
  archiveResult = { error: null },
  deleteResult = { error: null },
}: {
  programResult: { data: unknown; error: unknown };
  daysResult?: { error: unknown };
  archiveResult?: { error: unknown };
  deleteResult?: { error: unknown };
}) {
  const single = jest.fn().mockResolvedValue(programResult);
  const select = jest.fn().mockReturnValue({ single });
  const insertProgram = jest.fn().mockReturnValue({ select });

  const insertDays = jest.fn().mockResolvedValue(daysResult);

  const archiveNeq = jest.fn().mockResolvedValue(archiveResult);
  const archiveEqStatus = jest.fn().mockReturnValue({ neq: archiveNeq });
  const archiveEqUser = jest.fn().mockReturnValue({ eq: archiveEqStatus });
  const update = jest.fn().mockReturnValue({ eq: archiveEqUser });

  const deleteEq = jest.fn().mockResolvedValue(deleteResult);
  const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq });

  mockedFrom.mockImplementation(
    (table: string) =>
      (table === 'program_days'
        ? { insert: insertDays }
        : { insert: insertProgram, update, delete: deleteFn }) as never,
  );

  return {
    insertProgram,
    insertDays,
    update,
    archiveEqUser,
    archiveEqStatus,
    archiveNeq,
    deleteFn,
    deleteEq,
  };
}

describe('createProgram', () => {
  it('rejects an empty day list without touching the database', async () => {
    const callsBefore = mockedFrom.mock.calls.length;

    await expect(createProgram('user-1', { name: 'X', days: [] })).rejects.toThrow(
      'createProgram requires at least one day',
    );

    expect(mockedFrom.mock.calls.length).toBe(callsBefore);
  });

  it('inserts the program, its days in order, archives other active programs, and returns the created program', async () => {
    const { insertProgram, insertDays, update, archiveEqUser, archiveEqStatus, archiveNeq } =
      mockCreateProgramFlow({
        programResult: {
          data: {
            id: 'program-1',
            name: 'Push / Pull / Legs',
            status: 'active',
            created_at: '2026-09-04',
          },
          error: null,
        },
      });

    const result = await createProgram('user-1', {
      name: 'Push / Pull / Legs',
      days: ['Push day', 'Pull day'],
    });

    expect(insertProgram).toHaveBeenCalledWith({ user_id: 'user-1', name: 'Push / Pull / Legs' });
    expect(insertDays).toHaveBeenCalledWith([
      { program_id: 'program-1', name: 'Push day', order_index: 0 },
      { program_id: 'program-1', name: 'Pull day', order_index: 1 },
    ]);
    expect(update).toHaveBeenCalledWith({ status: 'archived' });
    expect(archiveEqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(archiveEqStatus).toHaveBeenCalledWith('status', 'active');
    expect(archiveNeq).toHaveBeenCalledWith('id', 'program-1');
    expect(result).toEqual({
      id: 'program-1',
      name: 'Push / Pull / Legs',
      status: 'active',
      createdAt: '2026-09-04',
    });
  });

  it('throws when the program insert fails, without inserting days or archiving', async () => {
    const error = new Error('rls denied');
    const { insertDays, update } = mockCreateProgramFlow({ programResult: { data: null, error } });

    await expect(createProgram('user-1', { name: 'X', days: ['Day 1'] })).rejects.toBe(error);
    expect(insertDays).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('deletes the orphaned program and throws when the days insert fails', async () => {
    const error = new Error('rls denied');
    const { deleteFn, deleteEq, update } = mockCreateProgramFlow({
      programResult: {
        data: { id: 'program-1', name: 'X', status: 'active', created_at: '2026-09-04' },
        error: null,
      },
      daysResult: { error },
    });

    await expect(createProgram('user-1', { name: 'X', days: ['Day 1'] })).rejects.toBe(error);
    expect(deleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('id', 'program-1');
    expect(update).not.toHaveBeenCalled();
  });

  it('throws when archiving other active programs fails', async () => {
    const error = new Error('rls denied');
    const { deleteFn } = mockCreateProgramFlow({
      programResult: {
        data: { id: 'program-1', name: 'X', status: 'active', created_at: '2026-09-04' },
        error: null,
      },
      archiveResult: { error },
    });

    await expect(createProgram('user-1', { name: 'X', days: ['Day 1'] })).rejects.toBe(error);
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
