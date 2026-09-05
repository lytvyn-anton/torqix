import { supabase } from '../../../shared/api/supabase';
import type { ActiveProgram, CreateProgramInput, Program } from '../types';

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

// Creates a program with the given name, days, and each day's exercises, then archives
// any other active program for this user so getActiveProgram always resolves to the one
// just created — there's no archive/deactivate UI yet, so without this a second program
// would silently become "active" by recency while the first stayed active-but-stale
// forever, and the Programs list would show two "active" (unbadged) rows.
//
// Four sequential writes rather than one transaction — supabase-js has no client-side
// transaction API — deliberately ordered so an earlier failure leaves prior state
// untouched: each insert only runs after its parent exists, and a failure at the days or
// day-exercises step deletes the program (cascading to any days/exercises already
// inserted for it) instead of leaving an orphan. Archiving other programs only runs once
// every insert has succeeded.
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

  const { error: archiveError } = await supabase
    .from('workout_programs')
    .update({ status: 'archived' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('id', program.id);
  if (archiveError) {
    // Without this cleanup, a failed archive step would leave the just-created program
    // active alongside the one it was supposed to replace — the exact "two active
    // programs" state this function exists to prevent (see header comment).
    await deleteOrphanedProgram(program.id);
    throw archiveError;
  }

  return {
    id: program.id,
    name: program.name,
    status: program.status,
    createdAt: program.created_at,
  };
}
