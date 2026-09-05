import { supabase } from '../../../shared/api/supabase';
import type {
  LogSetInput,
  ProgramDayExerciseDetail,
  ProgramDaySummary,
  SetLog,
  WorkoutHistoryEntry,
  WorkoutSession,
  WorkoutSummary,
} from '../types';

// Local calendar date (not `toISOString().slice(0, 10)`, which is UTC and can land on the
// wrong day close to midnight in the user's timezone).
function todayDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// A program's days, in order — the "which day do you want to do" list on the Today screen.
export async function getProgramDays(programId: string): Promise<ProgramDaySummary[]> {
  const { data, error } = await supabase
    .from('program_days')
    .select('id, name, order_index')
    .eq('program_id', programId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({ id: row.id, name: row.name, orderIndex: row.order_index }));
}

// A program day's exercises with their target sets/reps/weight, in order — what the Set
// Logging screen renders.
export async function getProgramDayExercises(
  programDayId: string,
): Promise<ProgramDayExerciseDetail[]> {
  const { data, error } = await supabase
    .from('program_day_exercises')
    .select('id, order_index, sets, reps, target_weight, exercise_id, exercises(name)')
    .eq('program_day_id', programDayId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: (row.exercises as unknown as { name: string }).name,
    orderIndex: row.order_index,
    sets: row.sets,
    reps: row.reps,
    targetWeight: row.target_weight,
  }));
}

// workout_sessions.program_day_id is nullable (ON DELETE SET NULL — a deleted program day
// shouldn't take a user's session history with it), so the embedded join can legitimately
// come back null; every read of it goes through this helper instead of assuming a name.
function programDayName(row: { program_days: { name: string } | null }): string {
  return row.program_days?.name ?? '';
}

// A workout left "planned" (started, not yet finished or cancelled) earlier today — lets
// the Today screen offer "Continue" instead of re-showing the day picker.
export async function getTodaySession(userId: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, program_day_id, status, program_days(name)')
    .eq('user_id', userId)
    .eq('scheduled_date', todayDateString())
    .eq('status', 'planned')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    programDayId: data.program_day_id,
    programDayName: programDayName(data as never),
    status: data.status,
  };
}

export async function getSession(sessionId: string): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, program_day_id, status, program_days(name)')
    .eq('id', sessionId)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    programDayId: data.program_day_id,
    programDayName: programDayName(data as never),
    status: data.status,
  };
}

export async function startWorkoutSession(
  userId: string,
  programDayId: string,
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, program_day_id: programDayId, scheduled_date: todayDateString() })
    .select('id, program_day_id, status, program_days(name)')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    programDayId: data.program_day_id,
    programDayName: programDayName(data as never),
    status: data.status,
  };
}

export async function getSetLogs(sessionId: string): Promise<SetLog[]> {
  const { data, error } = await supabase
    .from('set_logs')
    .select('id, exercise_id, set_index, reps_done, weight')
    .eq('workout_session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    setIndex: row.set_index,
    repsDone: row.reps_done,
    weight: row.weight,
  }));
}

export async function logSet(sessionId: string, input: LogSetInput): Promise<SetLog> {
  const { data, error } = await supabase
    .from('set_logs')
    .insert({
      workout_session_id: sessionId,
      exercise_id: input.exerciseId,
      set_index: input.setIndex,
      reps_done: input.repsDone,
      weight: input.weight,
    })
    .select('id, exercise_id, set_index, reps_done, weight')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    exerciseId: data.exercise_id,
    setIndex: data.set_index,
    repsDone: data.reps_done,
    weight: data.weight,
  };
}

export async function completeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function cancelSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ status: 'skipped' })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function getWorkoutSummary(sessionId: string): Promise<WorkoutSummary> {
  const [{ data: session, error: sessionError }, { count, error: countError }] = await Promise.all([
    supabase.from('workout_sessions').select('program_days(name)').eq('id', sessionId).single(),
    supabase
      .from('set_logs')
      .select('id', { count: 'exact', head: true })
      .eq('workout_session_id', sessionId),
  ]);
  if (sessionError) throw sessionError;
  if (countError) throw countError;
  return {
    programDayName: programDayName(session as never),
    setCount: count ?? 0,
  };
}

// Finished or abandoned sessions, most recent first — the History tab's list.
export async function getWorkoutHistory(userId: string): Promise<WorkoutHistoryEntry[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, scheduled_date, status, program_days(name)')
    .eq('user_id', userId)
    .in('status', ['done', 'skipped'])
    .order('scheduled_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    programDayName: programDayName(row as never),
    scheduledDate: row.scheduled_date,
    status: row.status,
  }));
}
