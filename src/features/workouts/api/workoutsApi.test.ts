import { supabase } from '../../../shared/api/supabase';
import {
  cancelSession,
  completeSession,
  getExerciseProgress,
  getLastPerformedSets,
  getLoggedExercises,
  getProgramDayExercises,
  getProgramDays,
  getSession,
  getSetLogs,
  getTodaySession,
  getWorkoutHistory,
  getWorkoutSummary,
  startWorkoutSession,
  syncSetLogs,
} from './workoutsApi';

jest.mock('../../../shared/api/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedFrom = jest.mocked(supabase.from);

describe('getProgramDays', () => {
  it('queries program_days for the program, ordered', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'day-1', name: 'Push day', order_index: 0 }],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getProgramDays('program-1');

    expect(mockedFrom).toHaveBeenCalledWith('program_days');
    expect(eq).toHaveBeenCalledWith('program_id', 'program-1');
    expect(order).toHaveBeenCalledWith('order_index', { ascending: true });
    expect(result).toEqual([{ id: 'day-1', name: 'Push day', orderIndex: 0 }]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    const order = jest.fn().mockResolvedValue({ data: null, error });
    mockedFrom.mockReturnValue({ select: () => ({ eq: () => ({ order }) }) } as never);

    await expect(getProgramDays('program-1')).rejects.toBe(error);
  });
});

describe('getProgramDayExercises', () => {
  it('queries program_day_exercises joined with exercises, ordered, and maps rows', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'pde-1',
          order_index: 0,
          sets: 3,
          reps: 10,
          target_weight: 40,
          exercise_id: 'ex-1',
          exercises: { name: 'Back Squat' },
        },
      ],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getProgramDayExercises('day-1');

    expect(mockedFrom).toHaveBeenCalledWith('program_day_exercises');
    expect(eq).toHaveBeenCalledWith('program_day_id', 'day-1');
    expect(result).toEqual([
      {
        id: 'pde-1',
        exerciseId: 'ex-1',
        exerciseName: 'Back Squat',
        orderIndex: 0,
        sets: 3,
        reps: 10,
        targetWeight: 40,
      },
    ]);
  });
});

describe('getTodaySession', () => {
  it("returns the user's planned session scheduled today, mapped", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'session-1',
        program_day_id: 'day-1',
        status: 'planned',
        program_days: { name: 'Push day' },
      },
      error: null,
    });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const eqStatus = jest.fn().mockReturnValue({ order });
    const eqDate = jest.fn().mockReturnValue({ eq: eqStatus });
    const eqUser = jest.fn().mockReturnValue({ eq: eqDate });
    const select = jest.fn().mockReturnValue({ eq: eqUser });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getTodaySession('user-1');

    expect(mockedFrom).toHaveBeenCalledWith('workout_sessions');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'planned');
    expect(result).toEqual({
      id: 'session-1',
      programDayId: 'day-1',
      programDayName: 'Push day',
      status: 'planned',
    });
  });

  it('returns null when there is no session today', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const eqStatus = jest.fn().mockReturnValue({ order });
    const eqDate = jest.fn().mockReturnValue({ eq: eqStatus });
    const eqUser = jest.fn().mockReturnValue({ eq: eqDate });
    mockedFrom.mockReturnValue({ select: () => ({ eq: eqUser }) } as never);

    expect(await getTodaySession('user-1')).toBeNull();
  });

  it("auto-skips and returns null when the session's program day was deleted", async () => {
    // program_day_id is nullable (ON DELETE SET NULL) — the program was deleted while this
    // session was still "planned", leaving it with no day left to resume.
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: 'session-1', program_day_id: null, status: 'planned', program_days: null },
      error: null,
    });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const eqStatus = jest.fn().mockReturnValue({ order });
    const eqDate = jest.fn().mockReturnValue({ eq: eqStatus });
    const eqUser = jest.fn().mockReturnValue({ eq: eqDate });
    const select = jest.fn().mockReturnValue({ eq: eqUser });

    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });

    mockedFrom.mockImplementation(
      (table: string) => (table === 'workout_sessions' ? { select, update } : { select }) as never,
    );

    const result = await getTodaySession('user-1');

    expect(update).toHaveBeenCalledWith({ status: 'skipped' });
    expect(updateEq).toHaveBeenCalledWith('id', 'session-1');
    expect(result).toBeNull();
  });
});

describe('startWorkoutSession', () => {
  it('inserts a planned session for today and returns it, mapped', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'session-1',
        program_day_id: 'day-1',
        status: 'planned',
        program_days: { name: 'Push day' },
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedFrom.mockReturnValue({ insert } as never);

    const result = await startWorkoutSession('user-1', 'day-1');

    expect(mockedFrom).toHaveBeenCalledWith('workout_sessions');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', program_day_id: 'day-1' }),
    );
    expect(result).toEqual({
      id: 'session-1',
      programDayId: 'day-1',
      programDayName: 'Push day',
      status: 'planned',
    });
  });
});

describe('getSession', () => {
  it('fetches a single session by id, mapped', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'session-1',
        program_day_id: 'day-1',
        status: 'planned',
        program_days: { name: 'Push day' },
      },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getSession('session-1');

    expect(eq).toHaveBeenCalledWith('id', 'session-1');
    expect(result.programDayName).toBe('Push day');
  });

  it('falls back to an empty name instead of throwing when the program day was deleted', async () => {
    // program_day_id is nullable (ON DELETE SET NULL) so this join can legitimately be null.
    const single = jest.fn().mockResolvedValue({
      data: { id: 'session-1', program_day_id: null, status: 'planned', program_days: null },
      error: null,
    });
    mockedFrom.mockReturnValue({ select: () => ({ eq: () => ({ single }) }) } as never);

    const result = await getSession('session-1');

    expect(result.programDayName).toBe('');
  });
});

describe('getSetLogs', () => {
  it('queries every set_log for the session, mapped', async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [{ id: 'log-1', exercise_id: 'ex-1', set_index: 0, reps_done: 10, weight: 40 }],
      error: null,
    });
    const select = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getSetLogs('session-1');

    expect(eq).toHaveBeenCalledWith('workout_session_id', 'session-1');
    expect(result).toEqual([
      { id: 'log-1', exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 40 },
    ]);
  });
});

describe('getLastPerformedSets', () => {
  it('returns nothing without querying when given no exercise ids', async () => {
    const callsBefore = mockedFrom.mock.calls.length;

    const result = await getLastPerformedSets([]);

    expect(mockedFrom).toHaveBeenCalledTimes(callsBefore);
    expect(result).toEqual([]);
  });

  it("keeps only each exercise's most recent session, dropping rows from older ones", async () => {
    const orderSetIndex = jest.fn().mockResolvedValue({
      data: [
        // ex-1's two most-recent-first sessions: session-2 (kept) then session-1 (dropped).
        {
          exercise_id: 'ex-1',
          set_index: 0,
          reps_done: 10,
          weight: 45,
          workout_session_id: 'session-2',
        },
        {
          exercise_id: 'ex-1',
          set_index: 1,
          reps_done: 8,
          weight: 47.5,
          workout_session_id: 'session-2',
        },
        {
          exercise_id: 'ex-1',
          set_index: 0,
          reps_done: 12,
          weight: 40,
          workout_session_id: 'session-1',
        },
        // ex-2 has just the one session.
        {
          exercise_id: 'ex-2',
          set_index: 0,
          reps_done: 15,
          weight: null,
          workout_session_id: 'session-3',
        },
      ],
      error: null,
    });
    const orderCompletedAt = jest.fn().mockReturnValue({ order: orderSetIndex });
    const orderDate = jest.fn().mockReturnValue({ order: orderCompletedAt });
    const eqStatus = jest.fn().mockReturnValue({ order: orderDate });
    const inExercise = jest.fn().mockReturnValue({ eq: eqStatus });
    const select = jest.fn().mockReturnValue({ in: inExercise });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getLastPerformedSets(['ex-1', 'ex-2']);

    expect(mockedFrom).toHaveBeenCalledWith('set_logs');
    expect(inExercise).toHaveBeenCalledWith('exercise_id', ['ex-1', 'ex-2']);
    expect(eqStatus).toHaveBeenCalledWith('workout_sessions.status', 'done');
    // Tiebreaker for two "done" sessions sharing a scheduled_date.
    expect(orderCompletedAt).toHaveBeenCalledWith('completed_at', {
      foreignTable: 'workout_sessions',
      ascending: false,
    });
    expect(result).toEqual([
      { exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 45 },
      { exerciseId: 'ex-1', setIndex: 1, repsDone: 8, weight: 47.5 },
      { exerciseId: 'ex-2', setIndex: 0, repsDone: 15, weight: null },
    ]);
  });
});

describe('syncSetLogs', () => {
  function mockChain() {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const gte = jest.fn().mockResolvedValue({ error: null });
    const eqExercise = jest.fn().mockReturnValue({ gte });
    const eqSession = jest.fn().mockReturnValue({ eq: eqExercise });
    const deleteFn = jest.fn().mockReturnValue({ eq: eqSession });
    mockedFrom.mockReturnValue({ upsert, delete: deleteFn } as never);
    return { upsert, deleteFn, eqSession, eqExercise, gte };
  }

  it('upserts every entered set keyed by session+exercise+slot', async () => {
    const { upsert, eqExercise, gte } = mockChain();

    await syncSetLogs(
      'session-1',
      ['ex-1'],
      [
        { exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 40 },
        { exerciseId: 'ex-1', setIndex: 1, repsDone: 8, weight: 42.5 },
      ],
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        {
          workout_session_id: 'session-1',
          exercise_id: 'ex-1',
          set_index: 0,
          reps_done: 10,
          weight: 40,
        },
        {
          workout_session_id: 'session-1',
          exercise_id: 'ex-1',
          set_index: 1,
          reps_done: 8,
          weight: 42.5,
        },
      ],
      { onConflict: 'workout_session_id,exercise_id,set_index' },
    );
    // Trims anything beyond the 2 sets just entered for ex-1 (a set that was cleared back
    // to blank after having been saved before).
    expect(eqExercise).toHaveBeenCalledWith('exercise_id', 'ex-1');
    expect(gte).toHaveBeenCalledWith('set_index', 2);
  });

  it('trims every set for an exercise that dropped to zero entries, without upserting', async () => {
    const { upsert, eqExercise, gte } = mockChain();

    await syncSetLogs('session-1', ['ex-1'], []);

    expect(upsert).not.toHaveBeenCalled();
    expect(eqExercise).toHaveBeenCalledWith('exercise_id', 'ex-1');
    expect(gte).toHaveBeenCalledWith('set_index', 0);
  });
});

describe('completeSession', () => {
  it('updates the session to done with a completed_at timestamp', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ update } as never);

    await completeSession('session-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'done', completed_at: expect.any(String) }),
    );
    expect(eq).toHaveBeenCalledWith('id', 'session-1');
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    const eq = jest.fn().mockResolvedValue({ error });
    mockedFrom.mockReturnValue({ update: () => ({ eq }) } as never);

    await expect(completeSession('session-1')).rejects.toBe(error);
  });
});

describe('cancelSession', () => {
  it('deletes any autosaved sets for the session, then marks it skipped', async () => {
    const eqDelete = jest.fn().mockResolvedValue({ error: null });
    const deleteFn = jest.fn().mockReturnValue({ eq: eqDelete });

    const eqUpdate = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: eqUpdate });

    mockedFrom.mockImplementation(
      (table: string) => (table === 'set_logs' ? { delete: deleteFn } : { update }) as never,
    );

    await cancelSession('session-1');

    expect(eqDelete).toHaveBeenCalledWith('workout_session_id', 'session-1');
    expect(update).toHaveBeenCalledWith({ status: 'skipped' });
    expect(eqUpdate).toHaveBeenCalledWith('id', 'session-1');
  });

  it('throws without updating the session if deleting its sets fails', async () => {
    const error = new Error('rls denied');
    const eqDelete = jest.fn().mockResolvedValue({ error });
    const update = jest.fn();
    mockedFrom.mockImplementation(
      (table: string) =>
        (table === 'set_logs' ? { delete: () => ({ eq: eqDelete }) } : { update }) as never,
    );

    await expect(cancelSession('session-1')).rejects.toBe(error);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('getWorkoutSummary', () => {
  it('combines the session name lookup with a set_logs count', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { program_days: { name: 'Push day' } },
      error: null,
    });
    const eqSession = jest.fn().mockReturnValue({ single });
    const selectSession = jest.fn().mockReturnValue({ eq: eqSession });

    const eqCount = jest.fn().mockResolvedValue({ count: 5, error: null });
    const selectCount = jest.fn().mockReturnValue({ eq: eqCount });

    mockedFrom.mockImplementation(
      (table: string) =>
        (table === 'set_logs' ? { select: selectCount } : { select: selectSession }) as never,
    );

    const result = await getWorkoutSummary('session-1');

    expect(selectCount).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(eqCount).toHaveBeenCalledWith('workout_session_id', 'session-1');
    expect(result).toEqual({ programDayName: 'Push day', setCount: 5 });
  });
});

describe('getWorkoutHistory', () => {
  it('queries done/skipped sessions for the user, newest first, mapped', async () => {
    const orderCreated = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'session-1',
          scheduled_date: '2026-09-01',
          status: 'done',
          program_days: { name: 'Push day' },
        },
      ],
      error: null,
    });
    const orderDate = jest.fn().mockReturnValue({ order: orderCreated });
    const inStatus = jest.fn().mockReturnValue({ order: orderDate });
    const eqUser = jest.fn().mockReturnValue({ in: inStatus });
    const select = jest.fn().mockReturnValue({ eq: eqUser });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getWorkoutHistory('user-1');

    expect(mockedFrom).toHaveBeenCalledWith('workout_sessions');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(inStatus).toHaveBeenCalledWith('status', ['done', 'skipped']);
    expect(orderDate).toHaveBeenCalledWith('scheduled_date', { ascending: false });
    expect(orderCreated).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual([
      { id: 'session-1', programDayName: 'Push day', scheduledDate: '2026-09-01', status: 'done' },
    ]);
  });

  it('falls back to an empty name for a session whose program day was deleted', async () => {
    const orderCreated = jest.fn().mockResolvedValue({
      data: [
        { id: 'session-1', scheduled_date: '2026-09-01', status: 'skipped', program_days: null },
      ],
      error: null,
    });
    mockedFrom.mockReturnValue({
      select: () => ({ eq: () => ({ in: () => ({ order: () => ({ order: orderCreated }) }) }) }),
    } as never);

    const result = await getWorkoutHistory('user-1');

    expect(result[0].programDayName).toBe('');
  });
});

describe('getExerciseProgress', () => {
  it('queries done sessions for the exercise, newest first, mapped', async () => {
    const orderSetIndex = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'log-1',
          set_index: 0,
          reps_done: 10,
          weight: 40,
          workout_sessions: { scheduled_date: '2026-09-01', status: 'done' },
        },
      ],
      error: null,
    });
    const orderDate = jest.fn().mockReturnValue({ order: orderSetIndex });
    const eqStatus = jest.fn().mockReturnValue({ order: orderDate });
    const eqExercise = jest.fn().mockReturnValue({ eq: eqStatus });
    const select = jest.fn().mockReturnValue({ eq: eqExercise });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getExerciseProgress('ex-1');

    expect(mockedFrom).toHaveBeenCalledWith('set_logs');
    expect(eqExercise).toHaveBeenCalledWith('exercise_id', 'ex-1');
    expect(eqStatus).toHaveBeenCalledWith('workout_sessions.status', 'done');
    expect(orderDate).toHaveBeenCalledWith('scheduled_date', {
      foreignTable: 'workout_sessions',
      ascending: false,
    });
    expect(orderSetIndex).toHaveBeenCalledWith('set_index', { ascending: true });
    expect(result).toEqual([
      { id: 'log-1', scheduledDate: '2026-09-01', setIndex: 0, repsDone: 10, weight: 40 },
    ]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    const orderSetIndex = jest.fn().mockResolvedValue({ data: null, error });
    mockedFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ eq: () => ({ order: () => ({ order: orderSetIndex }) }) }),
      }),
    } as never);

    await expect(getExerciseProgress('ex-1')).rejects.toBe(error);
  });
});

describe('getLoggedExercises', () => {
  it('aggregates one summary per exercise, using its most recent session for the set count', async () => {
    const orderDate = jest.fn().mockResolvedValue({
      data: [
        {
          exercise_id: 'ex-1',
          workout_session_id: 'session-2',
          exercises: { name: 'Bench Press' },
          workout_sessions: { scheduled_date: '2026-09-01', status: 'done', user_id: 'user-1' },
        },
        {
          exercise_id: 'ex-1',
          workout_session_id: 'session-2',
          exercises: { name: 'Bench Press' },
          workout_sessions: { scheduled_date: '2026-09-01', status: 'done', user_id: 'user-1' },
        },
        {
          exercise_id: 'ex-2',
          workout_session_id: 'session-3',
          exercises: { name: 'Back Squat' },
          workout_sessions: { scheduled_date: '2026-08-30', status: 'done', user_id: 'user-1' },
        },
        {
          exercise_id: 'ex-1',
          workout_session_id: 'session-1',
          exercises: { name: 'Bench Press' },
          workout_sessions: { scheduled_date: '2026-08-25', status: 'done', user_id: 'user-1' },
        },
      ],
      error: null,
    });
    const eqStatus = jest.fn().mockReturnValue({ order: orderDate });
    const eqUser = jest.fn().mockReturnValue({ eq: eqStatus });
    const select = jest.fn().mockReturnValue({ eq: eqUser });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getLoggedExercises('user-1');

    expect(mockedFrom).toHaveBeenCalledWith('set_logs');
    expect(eqUser).toHaveBeenCalledWith('workout_sessions.user_id', 'user-1');
    expect(eqStatus).toHaveBeenCalledWith('workout_sessions.status', 'done');
    expect(orderDate).toHaveBeenCalledWith('scheduled_date', {
      foreignTable: 'workout_sessions',
      ascending: false,
    });
    expect(result).toEqual([
      {
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        lastScheduledDate: '2026-09-01',
        lastSessionSetCount: 2,
      },
      {
        exerciseId: 'ex-2',
        exerciseName: 'Back Squat',
        lastScheduledDate: '2026-08-30',
        lastSessionSetCount: 1,
      },
    ]);
  });

  it('does not merge two distinct sessions that share the same scheduled date', async () => {
    const orderDate = jest.fn().mockResolvedValue({
      data: [
        {
          exercise_id: 'ex-1',
          workout_session_id: 'session-1',
          exercises: { name: 'Bench Press' },
          workout_sessions: { scheduled_date: '2026-09-01', status: 'done', user_id: 'user-1' },
        },
        {
          exercise_id: 'ex-1',
          workout_session_id: 'session-2',
          exercises: { name: 'Bench Press' },
          workout_sessions: { scheduled_date: '2026-09-01', status: 'done', user_id: 'user-1' },
        },
      ],
      error: null,
    });
    mockedFrom.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ order: orderDate }) }) }),
    } as never);

    const result = await getLoggedExercises('user-1');

    expect(result).toEqual([
      {
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        lastScheduledDate: '2026-09-01',
        lastSessionSetCount: 1,
      },
    ]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    const orderDate = jest.fn().mockResolvedValue({ data: null, error });
    mockedFrom.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ order: orderDate }) }) }),
    } as never);

    await expect(getLoggedExercises('user-1')).rejects.toBe(error);
  });
});
