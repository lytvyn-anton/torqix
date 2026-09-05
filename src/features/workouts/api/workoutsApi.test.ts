import { supabase } from '../../../shared/api/supabase';
import {
  cancelSession,
  completeSession,
  getProgramDayExercises,
  getProgramDays,
  getSession,
  getSetLogs,
  getTodaySession,
  getWorkoutSummary,
  logSet,
  startWorkoutSession,
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
  it('queries set_logs for the session, ordered, mapped', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'log-1', exercise_id: 'ex-1', set_index: 0, reps_done: 10, weight: 40 }],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ select } as never);

    const result = await getSetLogs('session-1');

    expect(eq).toHaveBeenCalledWith('workout_session_id', 'session-1');
    expect(result).toEqual([
      { id: 'log-1', exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 40 },
    ]);
  });
});

describe('logSet', () => {
  it('inserts a set log and returns it, mapped', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'log-1', exercise_id: 'ex-1', set_index: 0, reps_done: 10, weight: 40 },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedFrom.mockReturnValue({ insert } as never);

    const result = await logSet('session-1', {
      exerciseId: 'ex-1',
      setIndex: 0,
      repsDone: 10,
      weight: 40,
    });

    expect(insert).toHaveBeenCalledWith({
      workout_session_id: 'session-1',
      exercise_id: 'ex-1',
      set_index: 0,
      reps_done: 10,
      weight: 40,
    });
    expect(result).toEqual({
      id: 'log-1',
      exerciseId: 'ex-1',
      setIndex: 0,
      repsDone: 10,
      weight: 40,
    });
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
  it('updates the session to skipped', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ update } as never);

    await cancelSession('session-1');

    expect(update).toHaveBeenCalledWith({ status: 'skipped' });
    expect(eq).toHaveBeenCalledWith('id', 'session-1');
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
