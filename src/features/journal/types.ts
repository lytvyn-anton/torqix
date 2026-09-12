// One logged set for one exercise, across saved journal entries, newest first — the
// per-exercise progress list.
export type ExerciseProgressEntry = {
  id: string;
  entryDate: string;
  setIndex: number;
  repsDone: number | null;
  weight: number | null;
};

// One row per exercise the user has ever logged a set for, most recently performed first —
// the Progress tab's exercise list.
export type ExerciseSummary = {
  exerciseId: string;
  exerciseName: string;
  lastEntryDate: string;
  lastEntrySetCount: number;
};

// A user-created, on-demand notebook tied to a program. programId is nullable because the
// FK is ON DELETE SET NULL — a deleted program shouldn't take the user's logged history
// with it, so an orphaned journal can still exist with no program to log against.
export type Journal = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  programId: string | null;
  createdAt: string;
};

// One row in the Programs screen's Journals list — the program's current name (if the
// journal is still linked to one) so each row shows at a glance which program it belongs
// to, without the full per-journal detail fetch used elsewhere.
export type JournalSummary = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  programName: string | null;
  createdAt: string;
};

// One saved entry in a journal's own list — dayName is null both for an entry whose
// journal_day was deleted and for one logged with no day picked at all.
export type JournalEntrySummary = {
  id: string;
  entryDate: string;
  dayName: string | null;
  setCount: number;
};

// A day within a journal's own, one-time copy of the days/exercises it was cloned from at
// creation (see journal_days/journal_day_exercises) — independent of the source program's
// program_days/program_day_exercises from that point on. Same shape as
// programs/types.ts's ProgramDetailDay/ProgramDetailExercise, kept as separate types since
// the two are no longer the same underlying data.
export type JournalDayExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  targetWeight: number | null;
};

export type JournalDay = {
  id: string;
  name: string;
  exercises: JournalDayExercise[];
};

// One set as entered in the logging UI, and as sent to createJournalEntry — the same shape
// the old set_logs flow used, kept for continuity with the domain vocabulary.
export type SetLogInput = {
  exerciseId: string;
  setIndex: number;
  repsDone: number | null;
  weight: number | null;
};

export type CreateJournalEntryInput = {
  journalId: string;
  journalDayId: string | null;
  sets: SetLogInput[];
};
