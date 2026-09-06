import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../../../shared/api/supabase';
import {
  IncompleteProfileError,
  createProgram,
  deleteProgram,
  generateProgram,
  getActiveProgram,
  getProgram,
  getPrograms,
  updateProgram,
} from './programsApi';

jest.mock('../../../shared/api/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockedFrom = jest.mocked(supabase.from);
const mockedInvoke = jest.mocked(supabase.functions.invoke);

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

// Builds the same select().eq().single() chain getProgram calls, resolving to `result`.
function mockGetProgramQuery(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ single });
  const select = jest.fn().mockReturnValue({ eq });
  mockedFrom.mockReturnValue({ select } as never);
  return { select, eq, single };
}

describe('getProgram', () => {
  it('fetches a program with its days and exercises sorted by order_index', async () => {
    const { select, eq } = mockGetProgramQuery({
      data: {
        id: 'program-1',
        name: 'Push / Pull / Legs',
        status: 'active',
        created_at: '2026-09-04',
        program_days: [
          {
            id: 'day-pull',
            name: 'Pull day',
            order_index: 1,
            program_day_exercises: [],
          },
          {
            id: 'day-push',
            name: 'Push day',
            order_index: 0,
            program_day_exercises: [
              {
                exercise_id: 'ex-2',
                order_index: 1,
                sets: 4,
                reps: 8,
                target_weight: null,
                exercises: { name: 'Incline Press' },
              },
              {
                exercise_id: 'ex-1',
                order_index: 0,
                sets: 3,
                reps: 10,
                target_weight: 40,
                exercises: { name: 'Back Squat' },
              },
            ],
          },
        ],
      },
      error: null,
    });

    const result = await getProgram('program-1');

    expect(mockedFrom).toHaveBeenCalledWith('workout_programs');
    expect(select).toHaveBeenCalledWith(
      'id, name, status, created_at, program_days(id, name, order_index, program_day_exercises(exercise_id, order_index, sets, reps, target_weight, exercises(name)))',
    );
    expect(eq).toHaveBeenCalledWith('id', 'program-1');
    expect(result).toEqual({
      id: 'program-1',
      name: 'Push / Pull / Legs',
      status: 'active',
      createdAt: '2026-09-04',
      days: [
        {
          id: 'day-push',
          name: 'Push day',
          exercises: [
            {
              exerciseId: 'ex-1',
              exerciseName: 'Back Squat',
              sets: 3,
              reps: 10,
              targetWeight: 40,
            },
            {
              exerciseId: 'ex-2',
              exerciseName: 'Incline Press',
              sets: 4,
              reps: 8,
              targetWeight: null,
            },
          ],
        },
        { id: 'day-pull', name: 'Pull day', exercises: [] },
      ],
    });
  });

  it('falls back to an empty exercise name when the exercise catalog join is null', async () => {
    mockGetProgramQuery({
      data: {
        id: 'program-1',
        name: 'X',
        status: 'active',
        created_at: '2026-09-04',
        program_days: [
          {
            id: 'day-1',
            name: 'Day 1',
            order_index: 0,
            program_day_exercises: [
              {
                exercise_id: 'ex-1',
                order_index: 0,
                sets: 3,
                reps: 10,
                target_weight: null,
                exercises: null,
              },
            ],
          },
        ],
      },
      error: null,
    });

    const result = await getProgram('program-1');

    expect(result.days[0].exercises[0].exerciseName).toBe('');
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    mockGetProgramQuery({ data: null, error });

    await expect(getProgram('program-1')).rejects.toBe(error);
  });
});

describe('deleteProgram', () => {
  it('deletes the program by id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const deleteFn = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ delete: deleteFn } as never);

    await deleteProgram('program-1');

    expect(mockedFrom).toHaveBeenCalledWith('workout_programs');
    expect(deleteFn).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'program-1');
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    const eq = jest.fn().mockResolvedValue({ error });
    mockedFrom.mockReturnValue({ delete: jest.fn().mockReturnValue({ eq }) } as never);

    await expect(deleteProgram('program-1')).rejects.toBe(error);
  });
});

// Builds the mocked chains for updateProgram's sequential writes: workout_programs
// update().eq() (rename), program_days select().eq() (existing day ids), program_days
// delete().in() (removed days), program_days update().eq() / insert().select().single()
// (one call per input day — a day whose id matches an existing row gets a name/order_index
// update, everything else gets inserted; insertedDayResults is consumed in the order new
// days are encountered), and program_day_exercises delete().in() / insert() (each day's
// exercises, wholesale).
function mockUpdateProgramFlow({
  nameUpdateResult = { error: null },
  existingDaysResult = { data: [], error: null },
  deleteRemovedResult = { error: null },
  matchedUpdateResults = [],
  insertedDayResults = [],
  deleteExercisesResult = { error: null },
  insertExercisesResult = { error: null },
}: {
  nameUpdateResult?: { error: unknown };
  existingDaysResult?: { data: unknown; error: unknown };
  deleteRemovedResult?: { error: unknown };
  matchedUpdateResults?: { error: unknown }[];
  insertedDayResults?: { data: unknown; error: unknown }[];
  deleteExercisesResult?: { error: unknown };
  insertExercisesResult?: { error: unknown };
}) {
  const nameEq = jest.fn().mockResolvedValue(nameUpdateResult);
  const updateName = jest.fn().mockReturnValue({ eq: nameEq });

  const existingDaysEq = jest.fn().mockResolvedValue(existingDaysResult);
  const selectExistingDays = jest.fn().mockReturnValue({ eq: existingDaysEq });

  const deleteRemovedIn = jest.fn().mockResolvedValue(deleteRemovedResult);
  const deleteRemovedDays = jest.fn().mockReturnValue({ in: deleteRemovedIn });

  let matchedUpdateCallIndex = 0;
  const matchedUpdateEq = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(matchedUpdateResults[matchedUpdateCallIndex++] ?? { error: null }),
    );
  const updateDay = jest.fn().mockReturnValue({ eq: matchedUpdateEq });

  let insertDayCallIndex = 0;
  const insertDaySingle = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(insertedDayResults[insertDayCallIndex++] ?? { data: null, error: null }),
    );
  const insertDaySelect = jest.fn().mockReturnValue({ single: insertDaySingle });
  const insertDay = jest.fn().mockReturnValue({ select: insertDaySelect });

  const deleteExercisesIn = jest.fn().mockResolvedValue(deleteExercisesResult);
  const deleteExercises = jest.fn().mockReturnValue({ in: deleteExercisesIn });

  const insertExercises = jest.fn().mockResolvedValue(insertExercisesResult);

  mockedFrom.mockImplementation((table: string) => {
    if (table === 'workout_programs') return { update: updateName } as never;
    if (table === 'program_days') {
      return {
        select: selectExistingDays,
        delete: deleteRemovedDays,
        update: updateDay,
        insert: insertDay,
      } as never;
    }
    return { delete: deleteExercises, insert: insertExercises } as never;
  });

  return {
    updateName,
    nameEq,
    selectExistingDays,
    existingDaysEq,
    deleteRemovedDays,
    deleteRemovedIn,
    updateDay,
    matchedUpdateEq,
    insertDay,
    insertDaySelect,
    deleteExercises,
    deleteExercisesIn,
    insertExercises,
  };
}

describe('updateProgram', () => {
  it('rejects an empty day list without touching the database', async () => {
    const callsBefore = mockedFrom.mock.calls.length;

    await expect(updateProgram('program-1', { name: 'X', days: [] })).rejects.toThrow(
      'updateProgram requires at least one day',
    );

    expect(mockedFrom.mock.calls.length).toBe(callsBefore);
  });

  it("keeps a matched day's id (even when renamed), inserts a new day, drops a removed one, and replaces exercises", async () => {
    const {
      updateName,
      nameEq,
      selectExistingDays,
      existingDaysEq,
      deleteRemovedDays,
      deleteRemovedIn,
      updateDay,
      matchedUpdateEq,
      insertDay,
      deleteExercises,
      deleteExercisesIn,
      insertExercises,
    } = mockUpdateProgramFlow({
      existingDaysResult: {
        data: [{ id: 'day-push-old' }, { id: 'day-pull-old' }],
        error: null,
      },
      insertedDayResults: [{ data: { id: 'day-legs-new' }, error: null }],
    });

    await updateProgram('program-1', {
      name: 'Renamed',
      days: [
        {
          // Same id as the existing "Push day" row, renamed — still matched by id, not name.
          id: 'day-push-old',
          name: 'Push day (renamed)',
          exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, targetWeight: 40 }],
        },
        { name: 'Legs day', exercises: [] },
      ],
    });

    expect(updateName).toHaveBeenCalledWith({ name: 'Renamed' });
    expect(nameEq).toHaveBeenCalledWith('id', 'program-1');
    expect(selectExistingDays).toHaveBeenCalledWith('id');
    expect(existingDaysEq).toHaveBeenCalledWith('program_id', 'program-1');
    // "day-pull-old" isn't referenced by any input day's id, so it's removed.
    expect(deleteRemovedDays).toHaveBeenCalled();
    expect(deleteRemovedIn).toHaveBeenCalledWith('id', ['day-pull-old']);
    // The renamed day matched by id — keeps its row, name and order_index both updated.
    expect(updateDay).toHaveBeenCalledWith({ name: 'Push day (renamed)', order_index: 0 });
    expect(matchedUpdateEq).toHaveBeenCalledWith('id', 'day-push-old');
    // "Legs day" has no id — inserted fresh.
    expect(insertDay).toHaveBeenCalledWith({
      program_id: 'program-1',
      name: 'Legs day',
      order_index: 1,
    });
    expect(deleteExercises).toHaveBeenCalled();
    expect(deleteExercisesIn).toHaveBeenCalledWith('program_day_id', [
      'day-push-old',
      'day-legs-new',
    ]);
    expect(insertExercises).toHaveBeenCalledWith([
      {
        program_day_id: 'day-push-old',
        exercise_id: 'ex-1',
        order_index: 0,
        sets: 3,
        reps: 10,
        target_weight: 40,
      },
    ]);
  });

  it('treats a same-named day with no matching id as a fresh insert, not a rename', async () => {
    // Regression case: two days ending up with the same name (a rename colliding with
    // another day's name, or plain duplicate names) must not cause id reuse — only a
    // matching id counts as "this is the same day".
    const { deleteRemovedDays, deleteRemovedIn, insertDay } = mockUpdateProgramFlow({
      existingDaysResult: { data: [{ id: 'day-a' }, { id: 'day-b' }], error: null },
      insertedDayResults: [{ data: { id: 'day-a-new' }, error: null }],
    });

    await updateProgram('program-1', {
      name: 'X',
      days: [
        // No id: this is (from the API's point of view) a brand-new day, even though its
        // name happens to collide with the untouched "day-b" below.
        { name: 'Legs', exercises: [] },
        { id: 'day-b', name: 'Legs', exercises: [] },
      ],
    });

    // "day-a" isn't referenced by any input id, so it's removed rather than reused.
    expect(deleteRemovedDays).toHaveBeenCalled();
    expect(deleteRemovedIn).toHaveBeenCalledWith('id', ['day-a']);
    expect(insertDay).toHaveBeenCalledWith({
      program_id: 'program-1',
      name: 'Legs',
      order_index: 0,
    });
  });

  it("doesn't touch program_days.delete when every existing day is still present", async () => {
    const { deleteRemovedDays } = mockUpdateProgramFlow({
      existingDaysResult: { data: [{ id: 'day-1' }], error: null },
    });

    await updateProgram('program-1', {
      name: 'X',
      days: [{ id: 'day-1', name: 'Day 1', exercises: [] }],
    });

    expect(deleteRemovedDays).not.toHaveBeenCalled();
  });

  it('skips the exercises insert entirely when no day has any exercises', async () => {
    const { insertExercises } = mockUpdateProgramFlow({
      existingDaysResult: { data: [{ id: 'day-1' }], error: null },
    });

    await updateProgram('program-1', {
      name: 'X',
      days: [{ id: 'day-1', name: 'Day 1', exercises: [] }],
    });

    expect(insertExercises).not.toHaveBeenCalled();
  });

  it('throws without looking up existing days when the rename fails', async () => {
    const error = new Error('rls denied');
    const { selectExistingDays } = mockUpdateProgramFlow({ nameUpdateResult: { error } });

    await expect(
      updateProgram('program-1', { name: 'X', days: [{ name: 'Day 1', exercises: [] }] }),
    ).rejects.toBe(error);
    expect(selectExistingDays).not.toHaveBeenCalled();
  });

  it('throws without writing any days when fetching the existing ones fails', async () => {
    const error = new Error('rls denied');
    const { deleteRemovedDays, updateDay, insertDay } = mockUpdateProgramFlow({
      existingDaysResult: { data: null, error },
    });

    await expect(
      updateProgram('program-1', { name: 'X', days: [{ name: 'Day 1', exercises: [] }] }),
    ).rejects.toBe(error);
    expect(deleteRemovedDays).not.toHaveBeenCalled();
    expect(updateDay).not.toHaveBeenCalled();
    expect(insertDay).not.toHaveBeenCalled();
  });

  it('throws without writing any days when deleting the removed ones fails', async () => {
    const error = new Error('rls denied');
    const { updateDay, insertDay } = mockUpdateProgramFlow({
      existingDaysResult: { data: [{ id: 'day-old' }], error: null },
      deleteRemovedResult: { error },
    });

    await expect(
      updateProgram('program-1', { name: 'X', days: [{ name: 'New day', exercises: [] }] }),
    ).rejects.toBe(error);
    expect(updateDay).not.toHaveBeenCalled();
    expect(insertDay).not.toHaveBeenCalled();
  });

  it("throws without touching exercises when a matched day's update fails", async () => {
    const error = new Error('rls denied');
    const { deleteExercises } = mockUpdateProgramFlow({
      existingDaysResult: { data: [{ id: 'day-1' }], error: null },
      matchedUpdateResults: [{ error }],
    });

    await expect(
      updateProgram('program-1', {
        name: 'X',
        days: [{ id: 'day-1', name: 'Day 1', exercises: [] }],
      }),
    ).rejects.toBe(error);
    expect(deleteExercises).not.toHaveBeenCalled();
  });

  it('throws without touching exercises when inserting a new day fails', async () => {
    const error = new Error('rls denied');
    const { deleteExercises } = mockUpdateProgramFlow({
      insertedDayResults: [{ data: null, error }],
    });

    await expect(
      updateProgram('program-1', { name: 'X', days: [{ name: 'Day 1', exercises: [] }] }),
    ).rejects.toBe(error);
    expect(deleteExercises).not.toHaveBeenCalled();
  });

  it('throws without inserting exercises when clearing the old ones fails', async () => {
    const error = new Error('rls denied');
    const { insertExercises } = mockUpdateProgramFlow({
      existingDaysResult: { data: [{ id: 'day-1' }], error: null },
      deleteExercisesResult: { error },
    });

    await expect(
      updateProgram('program-1', {
        name: 'X',
        days: [
          {
            id: 'day-1',
            name: 'Day 1',
            exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, targetWeight: null }],
          },
        ],
      }),
    ).rejects.toBe(error);
    expect(insertExercises).not.toHaveBeenCalled();
  });

  it('throws when inserting the new exercises fails', async () => {
    const error = new Error('rls denied');
    mockUpdateProgramFlow({
      existingDaysResult: { data: [{ id: 'day-1' }], error: null },
      insertExercisesResult: { error },
    });

    await expect(
      updateProgram('program-1', {
        name: 'X',
        days: [
          {
            id: 'day-1',
            name: 'Day 1',
            exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, targetWeight: null }],
          },
        ],
      }),
    ).rejects.toBe(error);
  });
});

// Builds the mocked chains for createProgram's four sequential writes: workout_programs
// insert().select().single() (program), program_days insert().select() (days),
// program_day_exercises insert() (day exercises), and workout_programs
// update().eq().eq().neq() (archiving other active programs) — plus the
// workout_programs delete().eq() used to clean up if a later insert fails.
function mockCreateProgramFlow({
  programResult,
  daysResult = { data: [], error: null },
  dayExercisesResult = { error: null },
  archiveResult = { error: null },
  deleteResult = { error: null },
}: {
  programResult: { data: unknown; error: unknown };
  daysResult?: { data: unknown; error: unknown };
  dayExercisesResult?: { error: unknown };
  archiveResult?: { error: unknown };
  deleteResult?: { error: unknown };
}) {
  const single = jest.fn().mockResolvedValue(programResult);
  const selectProgram = jest.fn().mockReturnValue({ single });
  const insertProgram = jest.fn().mockReturnValue({ select: selectProgram });

  const selectDays = jest.fn().mockResolvedValue(daysResult);
  const insertDays = jest.fn().mockReturnValue({ select: selectDays });

  const insertDayExercises = jest.fn().mockResolvedValue(dayExercisesResult);

  const archiveNeq = jest.fn().mockResolvedValue(archiveResult);
  const archiveEqStatus = jest.fn().mockReturnValue({ neq: archiveNeq });
  const archiveEqUser = jest.fn().mockReturnValue({ eq: archiveEqStatus });
  const update = jest.fn().mockReturnValue({ eq: archiveEqUser });

  const deleteEq = jest.fn().mockResolvedValue(deleteResult);
  const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq });

  mockedFrom.mockImplementation((table: string) => {
    if (table === 'program_days') return { insert: insertDays } as never;
    if (table === 'program_day_exercises') return { insert: insertDayExercises } as never;
    return { insert: insertProgram, update, delete: deleteFn } as never;
  });

  return {
    insertProgram,
    insertDays,
    insertDayExercises,
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

  it("inserts the program, its days, each day's exercises, archives other active programs, and returns the created program", async () => {
    const {
      insertProgram,
      insertDays,
      insertDayExercises,
      update,
      archiveEqUser,
      archiveEqStatus,
      archiveNeq,
    } = mockCreateProgramFlow({
      programResult: {
        data: {
          id: 'program-1',
          name: 'Push / Pull / Legs',
          status: 'active',
          created_at: '2026-09-04',
        },
        error: null,
      },
      // Returned out of insertion order on purpose, to prove the zip-back sorts by order_index.
      daysResult: {
        data: [
          { id: 'day-pull', order_index: 1 },
          { id: 'day-push', order_index: 0 },
        ],
        error: null,
      },
    });

    const result = await createProgram('user-1', {
      name: 'Push / Pull / Legs',
      days: [
        {
          name: 'Push day',
          exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, targetWeight: 40 }],
        },
        { name: 'Pull day', exercises: [] },
      ],
    });

    expect(insertProgram).toHaveBeenCalledWith({ user_id: 'user-1', name: 'Push / Pull / Legs' });
    expect(insertDays).toHaveBeenCalledWith([
      { program_id: 'program-1', name: 'Push day', order_index: 0 },
      { program_id: 'program-1', name: 'Pull day', order_index: 1 },
    ]);
    expect(insertDayExercises).toHaveBeenCalledWith([
      {
        program_day_id: 'day-push',
        exercise_id: 'ex-1',
        order_index: 0,
        sets: 3,
        reps: 10,
        target_weight: 40,
      },
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

  it('skips the day-exercises insert entirely when no day has any exercises', async () => {
    const { insertDayExercises } = mockCreateProgramFlow({
      programResult: {
        data: { id: 'program-1', name: 'X', status: 'active', created_at: '2026-09-04' },
        error: null,
      },
      daysResult: { data: [{ id: 'day-1', order_index: 0 }], error: null },
    });

    await createProgram('user-1', { name: 'X', days: [{ name: 'Day 1', exercises: [] }] });

    expect(insertDayExercises).not.toHaveBeenCalled();
  });

  it('throws when the program insert fails, without inserting days or archiving', async () => {
    const error = new Error('rls denied');
    const { insertDays, update } = mockCreateProgramFlow({ programResult: { data: null, error } });

    await expect(
      createProgram('user-1', { name: 'X', days: [{ name: 'Day 1', exercises: [] }] }),
    ).rejects.toBe(error);
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
      daysResult: { data: null, error },
    });

    await expect(
      createProgram('user-1', { name: 'X', days: [{ name: 'Day 1', exercises: [] }] }),
    ).rejects.toBe(error);
    expect(deleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('id', 'program-1');
    expect(update).not.toHaveBeenCalled();
  });

  it('deletes the orphaned program and throws when the day-exercises insert fails', async () => {
    const error = new Error('rls denied');
    const { deleteFn, deleteEq, update } = mockCreateProgramFlow({
      programResult: {
        data: { id: 'program-1', name: 'X', status: 'active', created_at: '2026-09-04' },
        error: null,
      },
      daysResult: { data: [{ id: 'day-1', order_index: 0 }], error: null },
      dayExercisesResult: { error },
    });

    await expect(
      createProgram('user-1', {
        name: 'X',
        days: [
          {
            name: 'Day 1',
            exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, targetWeight: null }],
          },
        ],
      }),
    ).rejects.toBe(error);
    expect(deleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('id', 'program-1');
    expect(update).not.toHaveBeenCalled();
  });

  it('deletes the just-created program and throws when archiving other active programs fails', async () => {
    const error = new Error('rls denied');
    const { deleteFn, deleteEq } = mockCreateProgramFlow({
      programResult: {
        data: { id: 'program-1', name: 'X', status: 'active', created_at: '2026-09-04' },
        error: null,
      },
      daysResult: { data: [{ id: 'day-1', order_index: 0 }], error: null },
      archiveResult: { error },
    });

    await expect(
      createProgram('user-1', { name: 'X', days: [{ name: 'Day 1', exercises: [] }] }),
    ).rejects.toBe(error);
    // Otherwise a failed archive leaves two "active" programs for this user — exactly
    // the state this function exists to prevent.
    expect(deleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('id', 'program-1');
  });

  it('deletes the orphaned program and throws when the days insert returns fewer rows than requested', async () => {
    const { deleteFn, deleteEq, insertDayExercises } = mockCreateProgramFlow({
      programResult: {
        data: { id: 'program-1', name: 'X', status: 'active', created_at: '2026-09-04' },
        error: null,
      },
      // Only one row back for two requested days — e.g. a partial-insert edge case.
      daysResult: { data: [{ id: 'day-1', order_index: 0 }], error: null },
    });

    await expect(
      createProgram('user-1', {
        name: 'X',
        days: [
          { name: 'Day 1', exercises: [] },
          { name: 'Day 2', exercises: [] },
        ],
      }),
    ).rejects.toThrow('createProgram: expected 2 inserted days, got 1');
    expect(deleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('id', 'program-1');
    expect(insertDayExercises).not.toHaveBeenCalled();
  });
});

// A FunctionsHttpError's `context` is the raw fetch Response the Edge Function returned —
// only `.json()` is exercised here, so that's all this fake needs to provide.
function functionsHttpError(body: unknown): FunctionsHttpError {
  return new FunctionsHttpError({ json: () => Promise.resolve(body) } as unknown as Response);
}

describe('generateProgram', () => {
  it('returns the saved program on success', async () => {
    const program = {
      id: 'program-1',
      name: 'AI Program',
      status: 'active',
      createdAt: '2026-09-06',
    };
    mockedInvoke.mockResolvedValue({ data: { program }, error: null } as never);

    await expect(generateProgram()).resolves.toEqual(program);
    expect(mockedInvoke).toHaveBeenCalledWith('generate-program');
  });

  it('throws IncompleteProfileError with the missing fields when the profile is incomplete', async () => {
    mockedInvoke.mockResolvedValue({
      data: null,
      error: functionsHttpError({
        error: 'Complete your profile before generating a program',
        missingFields: ['goal', 'availableDaysPerWeek'],
      }),
    } as never);

    const error = await generateProgram().catch((e) => e);
    expect(error).toBeInstanceOf(IncompleteProfileError);
    expect((error as IncompleteProfileError).missingFields).toEqual([
      'goal',
      'availableDaysPerWeek',
    ]);
  });

  it("throws the Edge Function's error message for a non-profile failure", async () => {
    mockedInvoke.mockResolvedValue({
      data: null,
      error: functionsHttpError({ error: 'Failed to generate a program' }),
    } as never);

    await expect(generateProgram()).rejects.toThrow('Failed to generate a program');
  });

  it('rethrows a network-level error as-is', async () => {
    const error = new Error('Failed to send a request to the Edge Function');
    mockedInvoke.mockResolvedValue({ data: null, error } as never);

    await expect(generateProgram()).rejects.toBe(error);
  });
});
