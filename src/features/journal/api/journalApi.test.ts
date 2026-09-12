import { supabase } from '../../../shared/api/supabase';
import {
  createJournal,
  createJournalEntry,
  getExerciseProgress,
  getJournal,
  getJournalEntries,
  getJournalForProgram,
  getLastPerformedJournalSets,
  getLoggedExercises,
  resolveJournalForProgram,
} from './journalApi';

jest.mock('../../../shared/api/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedFrom = jest.mocked(supabase.from);

describe('getExerciseProgress', () => {
  it('queries journal_entry_set_logs for the exercise, newest entry first, mapped', async () => {
    const orderSetIndex = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'log-1',
          set_index: 0,
          reps_done: 10,
          weight: 40,
          journal_entries: { entry_date: '2026-09-01' },
        },
      ],
      error: null,
    });
    const orderDate = jest.fn().mockReturnValue({ order: orderSetIndex });
    const eqExercise = jest.fn().mockReturnValue({ order: orderDate });
    const select = jest.fn().mockReturnValue({ eq: eqExercise });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getExerciseProgress('ex-1');

    expect(mockedFrom).toHaveBeenCalledWith('journal_entry_set_logs');
    expect(eqExercise).toHaveBeenCalledWith('exercise_id', 'ex-1');
    expect(orderDate).toHaveBeenCalledWith('entry_date', {
      foreignTable: 'journal_entries',
      ascending: false,
    });
    expect(orderSetIndex).toHaveBeenCalledWith('set_index', { ascending: true });
    expect(result).toEqual([
      { id: 'log-1', entryDate: '2026-09-01', setIndex: 0, repsDone: 10, weight: 40 },
    ]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    const orderSetIndex = jest.fn().mockResolvedValue({ data: null, error });
    mockedFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => ({ order: orderSetIndex }) }) }),
    } as never);

    await expect(getExerciseProgress('ex-1')).rejects.toBe(error);
  });
});

describe('getLoggedExercises', () => {
  it('aggregates one summary per exercise, using its most recent entry for the set count', async () => {
    const orderCreatedAt = jest.fn().mockResolvedValue({
      data: [
        {
          exercise_id: 'ex-1',
          journal_entry_id: 'entry-2',
          exercises: { name: 'Bench Press' },
          journal_entries: { entry_date: '2026-09-01', user_id: 'user-1' },
        },
        {
          exercise_id: 'ex-1',
          journal_entry_id: 'entry-2',
          exercises: { name: 'Bench Press' },
          journal_entries: { entry_date: '2026-09-01', user_id: 'user-1' },
        },
        {
          exercise_id: 'ex-2',
          journal_entry_id: 'entry-3',
          exercises: { name: 'Back Squat' },
          journal_entries: { entry_date: '2026-08-30', user_id: 'user-1' },
        },
        {
          exercise_id: 'ex-1',
          journal_entry_id: 'entry-1',
          exercises: { name: 'Bench Press' },
          journal_entries: { entry_date: '2026-08-25', user_id: 'user-1' },
        },
      ],
      error: null,
    });
    const orderDate = jest.fn().mockReturnValue({ order: orderCreatedAt });
    const eqUser = jest.fn().mockReturnValue({ order: orderDate });
    const select = jest.fn().mockReturnValue({ eq: eqUser });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getLoggedExercises('user-1');

    expect(mockedFrom).toHaveBeenCalledWith('journal_entry_set_logs');
    expect(eqUser).toHaveBeenCalledWith('journal_entries.user_id', 'user-1');
    expect(orderDate).toHaveBeenCalledWith('entry_date', {
      foreignTable: 'journal_entries',
      ascending: false,
    });
    // Tiebreaker for two entries sharing an entry_date, so their rows can't interleave.
    expect(orderCreatedAt).toHaveBeenCalledWith('created_at', {
      foreignTable: 'journal_entries',
      ascending: false,
    });
    expect(result).toEqual([
      {
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        lastEntryDate: '2026-09-01',
        lastEntrySetCount: 2,
      },
      {
        exerciseId: 'ex-2',
        exerciseName: 'Back Squat',
        lastEntryDate: '2026-08-30',
        lastEntrySetCount: 1,
      },
    ]);
  });

  it('does not merge two distinct entries that share the same entry date', async () => {
    const orderCreatedAt = jest.fn().mockResolvedValue({
      data: [
        {
          exercise_id: 'ex-1',
          journal_entry_id: 'entry-1',
          exercises: { name: 'Bench Press' },
          journal_entries: { entry_date: '2026-09-01', user_id: 'user-1' },
        },
        {
          exercise_id: 'ex-1',
          journal_entry_id: 'entry-2',
          exercises: { name: 'Bench Press' },
          journal_entries: { entry_date: '2026-09-01', user_id: 'user-1' },
        },
      ],
      error: null,
    });
    mockedFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => ({ order: orderCreatedAt }) }) }),
    } as never);

    const result = await getLoggedExercises('user-1');

    expect(result).toEqual([
      {
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        lastEntryDate: '2026-09-01',
        lastEntrySetCount: 1,
      },
    ]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    const orderCreatedAt = jest.fn().mockResolvedValue({ data: null, error });
    mockedFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => ({ order: orderCreatedAt }) }) }),
    } as never);

    await expect(getLoggedExercises('user-1')).rejects.toBe(error);
  });
});

describe('getJournal', () => {
  it('fetches a single journal by id, mapped', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'journal-1',
        name: 'Push/Pull/Legs journal',
        program_id: 'program-1',
        created_at: '2026-09-01T00:00:00Z',
      },
      error: null,
    });
    const eqId = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq: eqId });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getJournal('journal-1');

    expect(mockedFrom).toHaveBeenCalledWith('journals');
    expect(eqId).toHaveBeenCalledWith('id', 'journal-1');
    expect(result).toEqual({
      id: 'journal-1',
      name: 'Push/Pull/Legs journal',
      programId: 'program-1',
      createdAt: '2026-09-01T00:00:00Z',
    });
  });

  it('throws the supabase error', async () => {
    const error = new Error('not found');
    mockedFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error }) }) }),
    } as never);

    await expect(getJournal('journal-1')).rejects.toBe(error);
  });
});

describe('getJournalEntries', () => {
  it("lists a journal's entries, newest first, mapped", async () => {
    const orderCreatedAt = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'entry-1',
          entry_date: '2026-09-01',
          program_days: { name: 'Push day' },
          journal_entry_set_logs: [{ id: 'log-1' }, { id: 'log-2' }],
        },
        {
          id: 'entry-2',
          entry_date: '2026-08-30',
          program_days: null,
          journal_entry_set_logs: [],
        },
      ],
      error: null,
    });
    const orderDate = jest.fn().mockReturnValue({ order: orderCreatedAt });
    const eqJournal = jest.fn().mockReturnValue({ order: orderDate });
    const select = jest.fn().mockReturnValue({ eq: eqJournal });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getJournalEntries('journal-1');

    expect(mockedFrom).toHaveBeenCalledWith('journal_entries');
    expect(eqJournal).toHaveBeenCalledWith('journal_id', 'journal-1');
    expect(result).toEqual([
      { id: 'entry-1', entryDate: '2026-09-01', programDayName: 'Push day', setCount: 2 },
      { id: 'entry-2', entryDate: '2026-08-30', programDayName: null, setCount: 0 },
    ]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    mockedFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ order: () => ({ order: () => Promise.resolve({ data: null, error }) }) }),
      }),
    } as never);

    await expect(getJournalEntries('journal-1')).rejects.toBe(error);
  });
});

describe('getLastPerformedJournalSets', () => {
  it('returns empty without querying when there are no exercise ids', async () => {
    mockedFrom.mockClear();

    const result = await getLastPerformedJournalSets([]);

    expect(result).toEqual([]);
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it("keeps only each exercise's most recently logged entry", async () => {
    const orderSetIndex = jest.fn().mockResolvedValue({
      data: [
        {
          exercise_id: 'ex-1',
          set_index: 0,
          reps_done: 8,
          weight: 60,
          journal_entry_id: 'entry-2',
          journal_entries: { entry_date: '2026-09-01', created_at: '2026-09-01T10:00:00Z' },
        },
        {
          exercise_id: 'ex-1',
          set_index: 1,
          reps_done: 8,
          weight: 60,
          journal_entry_id: 'entry-2',
          journal_entries: { entry_date: '2026-09-01', created_at: '2026-09-01T10:00:00Z' },
        },
        {
          exercise_id: 'ex-1',
          set_index: 0,
          reps_done: 10,
          weight: 40,
          journal_entry_id: 'entry-1',
          journal_entries: { entry_date: '2026-08-25', created_at: '2026-08-25T10:00:00Z' },
        },
      ],
      error: null,
    });
    const orderCreatedAt = jest.fn().mockReturnValue({ order: orderSetIndex });
    const orderDate = jest.fn().mockReturnValue({ order: orderCreatedAt });
    const inExercise = jest.fn().mockReturnValue({ order: orderDate });
    const select = jest.fn().mockReturnValue({ in: inExercise });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getLastPerformedJournalSets(['ex-1']);

    expect(mockedFrom).toHaveBeenCalledWith('journal_entry_set_logs');
    expect(inExercise).toHaveBeenCalledWith('exercise_id', ['ex-1']);
    expect(result).toEqual([
      { exerciseId: 'ex-1', setIndex: 0, repsDone: 8, weight: 60 },
      { exerciseId: 'ex-1', setIndex: 1, repsDone: 8, weight: 60 },
    ]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    mockedFrom.mockReturnValue({
      select: () => ({
        in: () => ({
          order: () => ({ order: () => ({ order: () => Promise.resolve({ data: null, error }) }) }),
        }),
      }),
    } as never);

    await expect(getLastPerformedJournalSets(['ex-1'])).rejects.toBe(error);
  });
});

describe('getJournalForProgram', () => {
  it("returns the user's most recently created journal for the program", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'journal-1' }, error: null });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const orderCreatedAt = jest.fn().mockReturnValue({ limit });
    const eqProgram = jest.fn().mockReturnValue({ order: orderCreatedAt });
    const eqUser = jest.fn().mockReturnValue({ eq: eqProgram });
    const select = jest.fn().mockReturnValue({ eq: eqUser });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getJournalForProgram('user-1', 'program-1');

    expect(mockedFrom).toHaveBeenCalledWith('journals');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqProgram).toHaveBeenCalledWith('program_id', 'program-1');
    expect(result).toEqual({ id: 'journal-1' });
  });

  it('returns null when no journal exists for the program yet', async () => {
    mockedFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            }),
          }),
        }),
      }),
    } as never);

    const result = await getJournalForProgram('user-1', 'program-1');

    expect(result).toBeNull();
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    mockedFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error }) }),
            }),
          }),
        }),
      }),
    } as never);

    await expect(getJournalForProgram('user-1', 'program-1')).rejects.toBe(error);
  });
});

describe('createJournal', () => {
  it('inserts a journal for the program', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'journal-1' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedFrom.mockReturnValue({ insert } as never);

    const result = await createJournal('user-1', { programId: 'program-1', name: 'PPL' });

    expect(mockedFrom).toHaveBeenCalledWith('journals');
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      program_id: 'program-1',
      name: 'PPL',
    });
    expect(result).toEqual({ id: 'journal-1' });
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    mockedFrom.mockReturnValue({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error }) }) }),
    } as never);

    await expect(createJournal('user-1', { programId: 'program-1', name: 'PPL' })).rejects.toBe(
      error,
    );
  });
});

describe('resolveJournalForProgram', () => {
  it('returns the existing journal without creating one', async () => {
    mockedFrom.mockClear();
    mockedFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'journal-1' }, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const result = await resolveJournalForProgram('user-1', 'program-1', 'PPL');

    expect(result).toEqual({ id: 'journal-1' });
    expect(mockedFrom).toHaveBeenCalledTimes(1);
  });

  it('creates a journal when none exists yet for this program', async () => {
    mockedFrom.mockImplementation(((table: string) => {
      if (table !== 'journals') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'journal-new', ...row }, error: null }),
          }),
        }),
      };
    }) as never);

    const result = await resolveJournalForProgram('user-1', 'program-1', 'PPL');

    expect(result).toEqual({
      id: 'journal-new',
      user_id: 'user-1',
      program_id: 'program-1',
      name: 'PPL',
    });
  });
});

describe('createJournalEntry', () => {
  it('inserts the entry then its set logs', async () => {
    const entrySingle = jest.fn().mockResolvedValue({ data: { id: 'entry-1' }, error: null });
    const entryInsert = jest.fn().mockReturnValue({ select: () => ({ single: entrySingle }) });
    const setsInsert = jest.fn().mockResolvedValue({ error: null });

    mockedFrom.mockImplementation(((table: string) => {
      if (table === 'journal_entries') return { insert: entryInsert };
      if (table === 'journal_entry_set_logs') return { insert: setsInsert };
      throw new Error(`unexpected table ${table}`);
    }) as never);

    const result = await createJournalEntry('user-1', {
      journalId: 'journal-1',
      programDayId: 'day-1',
      sets: [{ exerciseId: 'ex-1', setIndex: 0, repsDone: 8, weight: 60 }],
    });

    expect(entryInsert).toHaveBeenCalledWith({
      journal_id: 'journal-1',
      user_id: 'user-1',
      program_day_id: 'day-1',
      entry_date: expect.any(String),
    });
    expect(setsInsert).toHaveBeenCalledWith([
      { journal_entry_id: 'entry-1', exercise_id: 'ex-1', set_index: 0, reps_done: 8, weight: 60 },
    ]);
    expect(result).toEqual({ id: 'entry-1' });
  });

  it('does not insert set logs when there are none', async () => {
    mockedFrom.mockClear();
    const entrySingle = jest.fn().mockResolvedValue({ data: { id: 'entry-1' }, error: null });
    const entryInsert = jest.fn().mockReturnValue({ select: () => ({ single: entrySingle }) });
    mockedFrom.mockReturnValue({ insert: entryInsert } as never);

    const result = await createJournalEntry('user-1', {
      journalId: 'journal-1',
      programDayId: null,
      sets: [],
    });

    expect(mockedFrom).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'entry-1' });
  });

  it('throws when the entry insert fails', async () => {
    const error = new Error('rls denied');
    mockedFrom.mockReturnValue({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error }) }) }),
    } as never);

    await expect(
      createJournalEntry('user-1', { journalId: 'journal-1', programDayId: null, sets: [] }),
    ).rejects.toBe(error);
  });

  it('deletes the orphaned entry when its set logs fail to save', async () => {
    const error = new Error('rls denied');
    const entrySingle = jest.fn().mockResolvedValue({ data: { id: 'entry-1' }, error: null });
    const entryInsert = jest.fn().mockReturnValue({ select: () => ({ single: entrySingle }) });
    const setsInsert = jest.fn().mockResolvedValue({ error });
    const deleteEq = jest.fn().mockResolvedValue({ error: null });
    const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq });

    mockedFrom.mockImplementation(((table: string) => {
      if (table === 'journal_entries') return { insert: entryInsert, delete: deleteFn };
      if (table === 'journal_entry_set_logs') return { insert: setsInsert };
      throw new Error(`unexpected table ${table}`);
    }) as never);

    await expect(
      createJournalEntry('user-1', {
        journalId: 'journal-1',
        programDayId: null,
        sets: [{ exerciseId: 'ex-1', setIndex: 0, repsDone: 8, weight: 60 }],
      }),
    ).rejects.toBe(error);

    expect(deleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('id', 'entry-1');
  });
});
