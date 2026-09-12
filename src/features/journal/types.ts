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
