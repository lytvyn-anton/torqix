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
  programId: string | null;
  createdAt: string;
};

// One saved entry in a journal's own list — programDayName is null both for an orphaned
// entry (its program day was deleted) and for one logged with no day picked at all.
export type JournalEntrySummary = {
  id: string;
  entryDate: string;
  programDayName: string | null;
  setCount: number;
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
  programDayId: string | null;
  sets: SetLogInput[];
};
