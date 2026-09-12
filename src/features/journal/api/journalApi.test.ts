import { supabase } from '../../../shared/api/supabase';
import { getExerciseProgress, getLoggedExercises } from './journalApi';

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
