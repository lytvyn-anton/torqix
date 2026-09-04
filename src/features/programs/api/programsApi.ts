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

// Creates a program with the given name and day list, then archives any other active
// program for this user so getActiveProgram always resolves to the one just created —
// there's no archive/deactivate UI yet, so without this a second program would silently
// become "active" by recency while the first stayed active-but-stale forever, and the
// Programs list would show two "active" (unbadged) rows.
//
// Three sequential writes rather than one transaction — supabase-js has no client-side
// transaction API — deliberately ordered so an earlier failure leaves prior state
// untouched: the days insert only runs after the program exists, a failed days insert
// deletes that program instead of leaving an orphan, and archiving other programs only
// runs once both inserts have succeeded.
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

  const { error: daysError } = await supabase.from('program_days').insert(
    input.days.map((name, index) => ({
      program_id: program.id,
      name,
      order_index: index,
    })),
  );
  if (daysError) {
    await supabase.from('workout_programs').delete().eq('id', program.id);
    throw daysError;
  }

  const { error: archiveError } = await supabase
    .from('workout_programs')
    .update({ status: 'archived' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('id', program.id);
  if (archiveError) throw archiveError;

  return {
    id: program.id,
    name: program.name,
    status: program.status,
    createdAt: program.created_at,
  };
}
