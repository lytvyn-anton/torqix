import { supabase } from '../../../shared/api/supabase';
import type {
  CreateJournalEntryInput,
  ExerciseProgressEntry,
  ExerciseSummary,
  Journal,
  JournalEntrySummary,
  JournalSummary,
  SetLogInput,
} from '../types';

// Local calendar date (not `toISOString().slice(0, 10)`, which is UTC and can land on the
// wrong day close to midnight in the user's timezone) — a journal entry is always logged
// "today", there's no scheduling a journal entry ahead like the old workout_sessions did.
function todayDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Every logged set for one exercise across saved journal entries, newest first — the
// per-exercise progress list. No explicit user filter: journal_entry_set_logs has no user_id
// column of its own, and RLS already scopes it through journal_entries ownership (see the
// migrations). Unlike the old set_logs query, there's no status filter — a journal_entries row
// only ever exists once explicitly saved, so every row here is already "done".
export async function getExerciseProgress(exerciseId: string): Promise<ExerciseProgressEntry[]> {
  const { data, error } = await supabase
    .from('journal_entry_set_logs')
    .select('id, set_index, reps_done, weight, journal_entries!inner(entry_date)')
    .eq('exercise_id', exerciseId)
    .order('entry_date', { foreignTable: 'journal_entries', ascending: false })
    .order('set_index', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    entryDate: (row.journal_entries as unknown as { entry_date: string }).entry_date,
    setIndex: row.set_index,
    repsDone: row.reps_done,
    weight: row.weight,
  }));
}

// One row per exercise the user has ever logged a set for, most recently performed first —
// the Progress tab's exercise list. Aggregated client-side from the flat
// journal_entry_set_logs rows rather than a SQL GROUP BY: this app's per-user set volume is
// small, and it keeps the same fetch-then-shape style as the rest of this API.
export async function getLoggedExercises(userId: string): Promise<ExerciseSummary[]> {
  const { data, error } = await supabase
    .from('journal_entry_set_logs')
    .select(
      'exercise_id, journal_entry_id, exercises(name), journal_entries!inner(entry_date, created_at, user_id)',
    )
    .eq('journal_entries.user_id', userId)
    .order('entry_date', { foreignTable: 'journal_entries', ascending: false })
    // Tiebreaker for two entries sharing an entry_date — without it, Postgres gives no
    // ordering guarantee among rows tied on entry_date, so two same-day entries' rows could
    // interleave and break the "keyed by journal_entry id" grouping below.
    .order('created_at', { foreignTable: 'journal_entries', ascending: false });
  if (error) throw error;

  // Keyed by journal_entry id, not entry_date — two distinct entries can legitimately share a
  // calendar date (e.g. two separate sessions logged the same day) and must not have their set
  // counts merged together.
  const summaries = new Map<string, ExerciseSummary & { lastJournalEntryId: string }>();
  for (const row of data) {
    const exerciseId = row.exercise_id;
    const journalEntryId = row.journal_entry_id;
    const entryDate = (row.journal_entries as unknown as { entry_date: string }).entry_date;
    const existing = summaries.get(exerciseId);
    if (!existing) {
      summaries.set(exerciseId, {
        exerciseId,
        exerciseName: (row.exercises as unknown as { name: string }).name,
        lastEntryDate: entryDate,
        lastEntrySetCount: 1,
        lastJournalEntryId: journalEntryId,
      });
    } else if (journalEntryId === existing.lastJournalEntryId) {
      existing.lastEntrySetCount += 1;
    }
  }
  return Array.from(summaries.values()).map((summary) => ({
    exerciseId: summary.exerciseId,
    exerciseName: summary.exerciseName,
    lastEntryDate: summary.lastEntryDate,
    lastEntrySetCount: summary.lastEntrySetCount,
  }));
}

export async function getJournal(journalId: string): Promise<Journal> {
  const { data, error } = await supabase
    .from('journals')
    .select('id, name, status, program_id, created_at')
    .eq('id', journalId)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    programId: data.program_id,
    createdAt: data.created_at,
  };
}

// All of a user's own journals, newest first, each joined to its program's current name
// (null once orphaned by a deleted program) — the Programs screen's Journals tab.
export async function getJournals(userId: string): Promise<JournalSummary[]> {
  const { data, error } = await supabase
    .from('journals')
    .select('id, name, status, created_at, workout_programs(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    programName: (row.workout_programs as unknown as { name: string } | null)?.name ?? null,
    createdAt: row.created_at,
  }));
}

export async function setJournalStatus(
  journalId: string,
  status: 'active' | 'archived',
): Promise<void> {
  const { error } = await supabase.from('journals').update({ status }).eq('id', journalId);
  if (error) throw error;
}

// Hard-deletes the journal; journal_entries and journal_entry_set_logs cascade away via
// their FKs — unlike deleteProgram, which only detaches journals (program_id SET NULL)
// rather than removing them, a deleted journal really does take its own history with it.
export async function deleteJournal(journalId: string): Promise<void> {
  const { error } = await supabase.from('journals').delete().eq('id', journalId);
  if (error) throw error;
}

// The user's own active journal for a given program, if one already exists — there's no
// unique constraint on (user_id, program_id) at the DB level (a journal is a user-created
// notebook, not an auto-provisioned one-per-program row), so this picks the most recently
// created one when more than one happens to exist. status='active' is deliberate: an
// archived journal must not be silently picked back up and logged into the next time the
// user starts a journal for this program (Home's JournalWidgetCard, ProgramDetailScreen's
// "Start a journal") — resolveJournalForProgram below creates a fresh one instead.
export async function getJournalForProgram(
  userId: string,
  programId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('journals')
    .select('id')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createJournal(
  userId: string,
  input: { programId: string | null; name: string },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('journals')
    .insert({ user_id: userId, program_id: input.programId, name: input.name })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

// Tapping a day on the Home journal card shouldn't ask the user to name anything or care
// whether this program already has a journal — it just resolves to "the" journal for this
// program, creating one (named after the program) the first time. Two sequential requests
// rather than one round trip: same reasoning as createJournalEntry above, no client-side
// transaction API to fall back on.
export async function resolveJournalForProgram(
  userId: string,
  programId: string,
  programName: string,
): Promise<{ id: string }> {
  const existing = await getJournalForProgram(userId, programId);
  if (existing) return existing;
  return createJournal(userId, { programId, name: programName });
}

// A journal's own saved entries, most recent first — the notebook's list screen.
// program_day_id is nullable (ON DELETE SET NULL) so the embedded join can legitimately
// come back null, same as the old workout_sessions/program_days relationship.
export async function getJournalEntries(journalId: string): Promise<JournalEntrySummary[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, entry_date, created_at, program_days(name), journal_entry_set_logs(id)')
    .eq('journal_id', journalId)
    .order('entry_date', { ascending: false })
    // Tiebreaker for two entries sharing an entry_date (e.g. two sessions logged the same
    // day) — without it there's no ordering guarantee between them.
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    entryDate: row.entry_date,
    programDayName: (row.program_days as unknown as { name: string } | null)?.name ?? null,
    setCount: (row.journal_entry_set_logs as unknown as { id: string }[]).length,
  }));
}

// The sets performed the last time each given exercise was logged, across any journal entry
// (its most recent entry only, not merged across every past one) — lets a fresh journal
// entry show what was done last time as a real starting value, same idea as the old
// set_logs-based getLastPerformedSets but with no "status: done" filter to apply, since a
// journal_entries row only ever exists once already saved.
export async function getLastPerformedJournalSets(exerciseIds: string[]): Promise<SetLogInput[]> {
  if (exerciseIds.length === 0) return [];
  const { data, error } = await supabase
    .from('journal_entry_set_logs')
    .select(
      'exercise_id, set_index, reps_done, weight, journal_entry_id, journal_entries!inner(entry_date, created_at)',
    )
    .in('exercise_id', exerciseIds)
    .order('entry_date', { foreignTable: 'journal_entries', ascending: false })
    .order('created_at', { foreignTable: 'journal_entries', ascending: false })
    .order('set_index', { ascending: true });
  if (error) throw error;

  // Keyed by journal_entry id, not just "most recent so far": two entries can legitimately
  // share an entry_date, so only rows from the very first entry id seen for each exercise
  // are kept — anything from an older entry is dropped.
  const lastEntryIdByExercise = new Map<string, string>();
  const result: SetLogInput[] = [];
  for (const row of data) {
    const exerciseId = row.exercise_id;
    const entryId = row.journal_entry_id;
    const knownEntryId = lastEntryIdByExercise.get(exerciseId);
    if (knownEntryId === undefined) {
      lastEntryIdByExercise.set(exerciseId, entryId);
    } else if (knownEntryId !== entryId) {
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

// Cleans up an entry that was inserted but whose sets failed to save, so a failed Save
// doesn't leave a phantom, set-less row in the journal's list. Surfaces its own failure via
// console.error rather than throwing — the caller is already mid-throw for the original
// error, and losing that in favor of a cleanup-step error would hide the actual cause.
async function deleteOrphanedJournalEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', entryId);
  if (error) {
    console.error(`Failed to clean up orphaned journal entry ${entryId}`, error);
  }
}

// Saves a journal entry and its set logs in one flow: a journal_entries row only ever
// exists once explicitly saved (no "planned but never finished" state, unlike the old
// workout_sessions), so this is the only place that ever inserts one. Two sequential writes
// rather than one transaction — supabase-js has no client-side transaction API — ordered so
// a set-log failure cleans up the now-orphaned entry instead of leaving a phantom empty one.
export async function createJournalEntry(
  userId: string,
  input: CreateJournalEntryInput,
): Promise<{ id: string }> {
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      journal_id: input.journalId,
      user_id: userId,
      program_day_id: input.programDayId,
      entry_date: todayDateString(),
    })
    .select('id')
    .single();
  if (entryError) throw entryError;

  if (input.sets.length > 0) {
    const { error: setsError } = await supabase.from('journal_entry_set_logs').insert(
      input.sets.map((set) => ({
        journal_entry_id: entry.id,
        exercise_id: set.exerciseId,
        set_index: set.setIndex,
        reps_done: set.repsDone,
        weight: set.weight,
      })),
    );
    if (setsError) {
      await deleteOrphanedJournalEntry(entry.id);
      throw setsError;
    }
  }

  return { id: entry.id };
}
