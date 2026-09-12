import { supabase } from '../../../shared/api/supabase';
import type { ExerciseProgressEntry, ExerciseSummary } from '../types';

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
