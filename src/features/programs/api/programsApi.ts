import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../../../shared/api/supabase';
import type { ActiveProgram, CreateProgramInput, Program, ProgramDetail } from '../types';

// "Active" is whichever of the user's non-template, status='active' programs was created
// most recently.
export async function getActiveProgram(userId: string): Promise<ActiveProgram | null> {
  const { data, error } = await supabase
    .from('workout_programs')
    .select('id, name')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// All of a user's own (non-template) programs, newest first — the Programs tab's list.
export async function getPrograms(userId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('workout_programs')
    .select('id, name, status, created_at')
    .eq('user_id', userId)
    .eq('is_template', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
  }));
}

type ProgramDetailRow = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  program_days: {
    id: string;
    name: string;
    order_index: number;
    program_day_exercises: {
      exercise_id: string;
      order_index: number;
      sets: number | null;
      reps: number | null;
      target_weight: number | null;
      exercises: { name: string } | null;
    }[];
  }[];
};

// A single program's full detail — name, status, and every day with its exercises (each
// joined to the exercise catalog for its display name) — sorted by order_index, for the
// program detail and edit screens.
export async function getProgram(programId: string): Promise<ProgramDetail> {
  const { data, error } = await supabase
    .from('workout_programs')
    .select(
      'id, name, status, created_at, program_days(id, name, order_index, program_day_exercises(exercise_id, order_index, sets, reps, target_weight, exercises(name)))',
    )
    .eq('id', programId)
    .single();
  if (error) throw error;

  const row = data as unknown as ProgramDetailRow;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    days: [...(row.program_days ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((day) => ({
        id: day.id,
        name: day.name,
        exercises: [...(day.program_day_exercises ?? [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map((exercise) => ({
            exerciseId: exercise.exercise_id,
            exerciseName: exercise.exercises?.name ?? '',
            sets: exercise.sets,
            reps: exercise.reps,
            targetWeight: exercise.target_weight,
          })),
      })),
  };
}

// Hard-deletes the program row; program_days and program_day_exercises cascade away via
// their FKs. journal_entries.program_day_id is ON DELETE SET NULL (not cascade), so any
// journal history already logged against this program survives with a blank day name.
export async function deleteProgram(programId: string): Promise<void> {
  const { error } = await supabase.from('workout_programs').delete().eq('id', programId);
  if (error) throw error;
}

// Replaces a program's name and its day/exercise list, matching input days to existing
// ones by id (ProgramDetailDay.id, threaded through ProgramForm) rather than by name — an
// unambiguous primary-key match, unlike a name, which two days can share or a rename can
// change. An unchanged/renamed day that keeps its id also keeps any journal_entries
// already logged against it: journal_entries.program_day_id is ON DELETE SET NULL (not
// cascade), so a naive delete-all-days-then-reinsert would hand every day a fresh id on
// every single edit, permanently blanking the day label on all of that program's history
// the moment any unrelated field was changed. Only a day genuinely added fresh in the form
// (no id) or removed from it loses its history association, which is unavoidable either way.
//
// Each day's exercises are still replaced wholesale rather than diffed — nothing else
// references a program_day_exercises row by id, so there's no identity worth preserving
// there, unlike the day rows themselves.
export async function updateProgram(programId: string, input: CreateProgramInput): Promise<void> {
  if (input.days.length === 0) {
    throw new Error('updateProgram requires at least one day');
  }

  const { error: nameError } = await supabase
    .from('workout_programs')
    .update({ name: input.name })
    .eq('id', programId);
  if (nameError) throw nameError;

  const { data: existingDays, error: existingDaysError } = await supabase
    .from('program_days')
    .select('id')
    .eq('program_id', programId);
  if (existingDaysError) throw existingDaysError;

  // A day whose id isn't referenced by any input day was removed in the form; anything
  // in input.days without a matching existing id (including every day with no id at all)
  // gets a freshly inserted row below.
  const existingIds = new Set(existingDays.map((day) => day.id));
  const keptIds = new Set(
    input.days.filter((day) => day.id && existingIds.has(day.id)).map((day) => day.id),
  );
  const idsToRemove = existingDays.filter((day) => !keptIds.has(day.id)).map((day) => day.id);

  if (idsToRemove.length > 0) {
    const { error: deleteRemovedError } = await supabase
      .from('program_days')
      .delete()
      .in('id', idsToRemove);
    if (deleteRemovedError) throw deleteRemovedError;
  }

  // Sequential rather than a single bulk write: each day needs to become either an update
  // (matched, keeping its id) or an insert (new), and the resulting id is needed below to
  // attach that day's exercises — day counts are small (a handful per program), so the
  // extra round trips aren't worth a mixed-upsert workaround.
  const dayIds: string[] = [];
  for (const [index, day] of input.days.entries()) {
    if (day.id && keptIds.has(day.id)) {
      const { error } = await supabase
        .from('program_days')
        .update({ name: day.name, order_index: index })
        .eq('id', day.id);
      if (error) throw error;
      dayIds.push(day.id);
    } else {
      const { data, error } = await supabase
        .from('program_days')
        .insert({ program_id: programId, name: day.name, order_index: index })
        .select('id')
        .single();
      if (error) throw error;
      dayIds.push(data.id);
    }
  }

  // Clears every day's existing exercises (a no-op for freshly inserted days) before
  // re-inserting the current set below.
  const { error: deleteExercisesError } = await supabase
    .from('program_day_exercises')
    .delete()
    .in('program_day_id', dayIds);
  if (deleteExercisesError) throw deleteExercisesError;

  const exerciseRows = input.days.flatMap((day, dayIndex) =>
    day.exercises.map((exercise, exerciseIndex) => ({
      program_day_id: dayIds[dayIndex],
      exercise_id: exercise.exerciseId,
      order_index: exerciseIndex,
      sets: exercise.sets,
      reps: exercise.reps,
      target_weight: exercise.targetWeight,
    })),
  );

  if (exerciseRows.length > 0) {
    const { error: exercisesError } = await supabase
      .from('program_day_exercises')
      .insert(exerciseRows);
    if (exercisesError) throw exercisesError;
  }
}

// Manual "Set active"/"Archive program" action from the program detail screen — the last
// piece of the fully-manual lifecycle now that createProgram no longer auto-archives
// siblings (see its own comment below).
export async function setProgramStatus(
  programId: string,
  status: 'active' | 'archived',
): Promise<void> {
  const { error } = await supabase.from('workout_programs').update({ status }).eq('id', programId);
  if (error) throw error;
}

// Thrown by generateProgram when the caller's profile is missing a field the Edge Function
// needs (goal, level, etc.) — distinguished from a generic failure so the screen can send
// the user to complete their profile instead of showing a plain "try again" error.
export class IncompleteProfileError extends Error {
  missingFields: string[];

  constructor(missingFields: string[]) {
    super('Complete your profile before generating a program');
    this.name = 'IncompleteProfileError';
    this.missingFields = missingFields;
  }
}

type GenerateProgramResponseBody =
  { program: Program } | { error: string; missingFields?: string[] };

// Calls the generate-program Edge Function, which reads the caller's profile and the
// exercise catalog, asks Gemini for a program, resolves and persists it server-side (see
// supabase/functions/generate-program/index.ts), and returns the saved program — the same
// shape createProgram returns, so the caller can navigate straight to its detail screen.
// supabase-js forwards the current session's access token as the Authorization header
// automatically, so no explicit user id is needed here.
export async function generateProgram(): Promise<Program> {
  const { data, error } =
    await supabase.functions.invoke<GenerateProgramResponseBody>('generate-program');

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context
        .json()
        .catch(() => null)) as GenerateProgramResponseBody | null;
      if (body && 'missingFields' in body && body.missingFields) {
        throw new IncompleteProfileError(body.missingFields);
      }
      throw new Error(body && 'error' in body ? body.error : error.message);
    }
    throw error;
  }
  if (!data || !('program' in data)) {
    throw new Error('generate-program returned no program');
  }
  return data.program;
}

// Deletes a program that failed partway through creation, cascading to any days/exercises
// already inserted for it. Surfaces its own failure via console.error rather than throwing
// — the caller is already mid-throw for the original error, and losing that in favor of a
// cleanup-step error would hide the actual cause.
async function deleteOrphanedProgram(programId: string): Promise<void> {
  const { error } = await supabase.from('workout_programs').delete().eq('id', programId);
  if (error) {
    console.error(`Failed to clean up orphaned program ${programId}`, error);
  }
}

// Creates a program with the given name, days, and each day's exercises. No longer archives
// any other active program as a side effect — that becomes a manual Programs-screen action in
// a later PR of the Journal pivot (PLAN.md Phase 5, PR 4). Until that ships, nothing stops a
// user from ending up with more than one status='active' program; getActiveProgram's "newest
// wins" tiebreak (see its own comment above) is what keeps that survivable in the meantime.
//
// Three sequential writes rather than one transaction — supabase-js has no client-side
// transaction API — deliberately ordered so an earlier failure leaves prior state
// untouched: each insert only runs after its parent exists, and a failure at the days or
// day-exercises step deletes the program (cascading to any days/exercises already
// inserted for it) instead of leaving an orphan.
export async function createProgram(userId: string, input: CreateProgramInput): Promise<Program> {
  if (input.days.length === 0) {
    throw new Error('createProgram requires at least one day');
  }

  const { data: program, error: programError } = await supabase
    .from('workout_programs')
    .insert({ user_id: userId, name: input.name })
    .select('id, name, status, created_at')
    .single();
  if (programError) throw programError;

  const { data: insertedDays, error: daysError } = await supabase
    .from('program_days')
    .insert(
      input.days.map((day, index) => ({
        program_id: program.id,
        name: day.name,
        order_index: index,
      })),
    )
    .select('id, order_index');
  if (daysError) {
    await deleteOrphanedProgram(program.id);
    throw daysError;
  }
  if (insertedDays.length !== input.days.length) {
    await deleteOrphanedProgram(program.id);
    throw new Error(
      `createProgram: expected ${input.days.length} inserted days, got ${insertedDays.length}`,
    );
  }

  // Insert order isn't guaranteed to match input order, so map by order_index (assigned
  // above as each day's array index) instead of relying on insertedDays' array position.
  const dayIdByOrderIndex = new Map(insertedDays.map((day) => [day.order_index, day.id]));

  const exerciseRows = input.days.flatMap((day, dayIndex) =>
    day.exercises.map((exercise, exerciseIndex) => ({
      program_day_id: dayIdByOrderIndex.get(dayIndex),
      exercise_id: exercise.exerciseId,
      order_index: exerciseIndex,
      sets: exercise.sets,
      reps: exercise.reps,
      target_weight: exercise.targetWeight,
    })),
  );

  if (exerciseRows.length > 0) {
    const { error: exercisesError } = await supabase
      .from('program_day_exercises')
      .insert(exerciseRows);
    if (exercisesError) {
      await deleteOrphanedProgram(program.id);
      throw exercisesError;
    }
  }

  return {
    id: program.id,
    name: program.name,
    status: program.status,
    createdAt: program.created_at,
  };
}
