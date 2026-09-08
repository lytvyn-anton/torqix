import { supabase } from '../../../shared/api/supabase';
import type {
  ExerciseProgressEntry,
  ExerciseSummary,
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

// Everything already saved for this session, across all exercises — how the Set Logging
// screen repopulates its fields with what was entered the last time this (still "planned")
// workout was open, and what the continuous autosave below diffs against.
export async function getSetLogs(sessionId: string): Promise<SetLog[]> {
  const { data, error } = await supabase
    .from('set_logs')
    .select('id, exercise_id, set_index, reps_done, weight')
    .eq('workout_session_id', sessionId);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    setIndex: row.set_index,
    repsDone: row.reps_done,
    weight: row.weight,
  }));
}

// The sets performed the last time each given exercise was actually finished (its most
// recent "done" session only, not merged across every past session) — lets a brand-new
// workout show what was done last time as a placeholder hint per row, instead of an empty
// slate, without changing the target-based defaults that ship with the program itself.
export async function getLastPerformedSets(exerciseIds: string[]): Promise<LogSetInput[]> {
  if (exerciseIds.length === 0) return [];
  const { data, error } = await supabase
    .from('set_logs')
    .select(
      'exercise_id, set_index, reps_done, weight, workout_session_id, workout_sessions!inner(scheduled_date, completed_at, status)',
    )
    .in('exercise_id', exerciseIds)
    .eq('workout_sessions.status', 'done')
    .order('scheduled_date', { foreignTable: 'workout_sessions', ascending: false })
    // Tiebreaker for two "done" sessions sharing a scheduled_date (a redo, or two program
    // days completed the same day) — without it, which one counts as "last time" would be
    // whatever order Postgres happens to return, not necessarily the one actually finished
    // most recently.
    .order('completed_at', { foreignTable: 'workout_sessions', ascending: false })
    .order('set_index', { ascending: true });
  if (error) throw error;

  // Keyed by session id, not just "most recent so far": two sessions can legitimately share
  // a scheduled_date (see getLoggedExercises above), so only rows from the very first
  // session id seen for each exercise are kept — anything from an older session is dropped.
  const lastSessionIdByExercise = new Map<string, string>();
  const result: LogSetInput[] = [];
  for (const row of data) {
    const exerciseId = row.exercise_id;
    const sessionId = row.workout_session_id;
    const knownSessionId = lastSessionIdByExercise.get(exerciseId);
    if (knownSessionId === undefined) {
      lastSessionIdByExercise.set(exerciseId, sessionId);
    } else if (knownSessionId !== sessionId) {
      continue;
    }
    result.push({
      exerciseId,
      setIndex: row.set_index,
      repsDone: row.reps_done,
      weight: row.weight,
    });
  }
  return result;
}

// Keeps a session's set_logs in sync with exactly what's currently entered, called
// continuously (debounced) as the user types and once more on "Finish workout" — never a
// one-time submit. `allExerciseIds` must list every exercise the day could have sets for
// (not just the ones present in `inputs`) so an exercise that was filled in and then
// cleared back to blank gets its now-stale rows trimmed too, not just left behind.
export async function syncSetLogs(
  sessionId: string,
  allExerciseIds: string[],
  inputs: LogSetInput[],
): Promise<void> {
  if (inputs.length > 0) {
    const { error } = await supabase.from('set_logs').upsert(
      inputs.map((input) => ({
        workout_session_id: sessionId,
        exercise_id: input.exerciseId,
        set_index: input.setIndex,
        reps_done: input.repsDone,
        weight: input.weight,
      })),
      { onConflict: 'workout_session_id,exercise_id,set_index' },
    );
    if (error) throw error;
  }

  const countByExercise = new Map<string, number>(allExerciseIds.map((id) => [id, 0]));
  for (const input of inputs) {
    countByExercise.set(input.exerciseId, (countByExercise.get(input.exerciseId) ?? 0) + 1);
  }
  // Trims run in parallel, not one at a time — this fires on every debounced autosave, so a
  // day with several exercises shouldn't pay for a sequential round trip per exercise.
  const results = await Promise.all(
    Array.from(countByExercise, ([exerciseId, count]) =>
      supabase
        .from('set_logs')
        .delete()
        .eq('workout_session_id', sessionId)
        .eq('exercise_id', exerciseId)
        .gte('set_index', count),
    ),
  );
  for (const { error } of results) {
    if (error) throw error;
  }
}

export async function completeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

// Also deletes any sets the continuous autosave already wrote for this (never finished)
// session — the cancel confirmation promises entered sets won't be saved, so cancelling has
// to actually discard them, not just leave the session as "skipped" with its rows intact.
export async function cancelSession(sessionId: string): Promise<void> {
  const { error: deleteError } = await supabase
    .from('set_logs')
    .delete()
    .eq('workout_session_id', sessionId);
  if (deleteError) throw deleteError;

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

// Every logged set for one exercise across completed workouts, newest first — the
// per-exercise progress list. No explicit user filter: set_logs has no user_id column of its
// own, and RLS already scopes it through workout_sessions ownership (see the migrations).
export async function getExerciseProgress(exerciseId: string): Promise<ExerciseProgressEntry[]> {
  const { data, error } = await supabase
    .from('set_logs')
    .select('id, set_index, reps_done, weight, workout_sessions!inner(scheduled_date, status)')
    .eq('exercise_id', exerciseId)
    .eq('workout_sessions.status', 'done')
    .order('scheduled_date', { foreignTable: 'workout_sessions', ascending: false })
    .order('set_index', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    scheduledDate: (row.workout_sessions as unknown as { scheduled_date: string }).scheduled_date,
    setIndex: row.set_index,
    repsDone: row.reps_done,
    weight: row.weight,
  }));
}

// One row per exercise the user has ever logged a set for, most recently performed first —
// the Progress tab's exercise list. Aggregated client-side from the flat set_logs rows rather
// than a SQL GROUP BY: this app's per-user set volume is small, and it keeps the same
// fetch-then-shape style as the rest of this file.
export async function getLoggedExercises(userId: string): Promise<ExerciseSummary[]> {
  const { data, error } = await supabase
    .from('set_logs')
    .select(
      'exercise_id, workout_session_id, exercises(name), workout_sessions!inner(scheduled_date, status, user_id)',
    )
    .eq('workout_sessions.user_id', userId)
    .eq('workout_sessions.status', 'done')
    .order('scheduled_date', { foreignTable: 'workout_sessions', ascending: false });
  if (error) throw error;

  // Keyed by session id, not scheduled_date — workout_sessions has no uniqueness constraint
  // on (user_id, scheduled_date), so two distinct "done" sessions can share a calendar date
  // (a rescheduled/redone session, or two program days both landing on the same day) and
  // must not have their set counts merged together.
  const summaries = new Map<string, ExerciseSummary & { lastSessionId: string }>();
  for (const row of data) {
    const exerciseId = row.exercise_id;
    const sessionId = row.workout_session_id;
    const scheduledDate = (row.workout_sessions as unknown as { scheduled_date: string })
      .scheduled_date;
    const existing = summaries.get(exerciseId);
    if (!existing) {
      summaries.set(exerciseId, {
        exerciseId,
        exerciseName: (row.exercises as unknown as { name: string }).name,
        lastScheduledDate: scheduledDate,
        lastSessionSetCount: 1,
        lastSessionId: sessionId,
      });
    } else if (sessionId === existing.lastSessionId) {
      existing.lastSessionSetCount += 1;
    }
  }
  return Array.from(summaries.values()).map((summary) => ({
    exerciseId: summary.exerciseId,
    exerciseName: summary.exerciseName,
    lastScheduledDate: summary.lastScheduledDate,
    lastSessionSetCount: summary.lastSessionSetCount,
  }));
}
