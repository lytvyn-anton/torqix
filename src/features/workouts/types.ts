export type ProgramDaySummary = {
  id: string;
  name: string;
  orderIndex: number;
};

export type ProgramDayExerciseDetail = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: number | null;
  reps: number | null;
  targetWeight: number | null;
};

export type WorkoutSessionStatus = 'planned' | 'done' | 'skipped';

export type WorkoutSession = {
  id: string;
  // Nullable: ON DELETE SET NULL when the program day is deleted (e.g. the whole program was
  // deleted) — the session row survives to keep history, but there's no day left to resume.
  programDayId: string | null;
  programDayName: string;
  status: WorkoutSessionStatus;
};

export type SetLog = {
  id: string;
  exerciseId: string;
  setIndex: number;
  repsDone: number | null;
  weight: number | null;
};

export type LogSetInput = {
  exerciseId: string;
  setIndex: number;
  repsDone: number | null;
  weight: number | null;
};

export type WorkoutSummary = {
  programDayName: string;
  setCount: number;
};

export type WorkoutHistoryEntry = {
  id: string;
  programDayName: string;
  scheduledDate: string;
  status: WorkoutSessionStatus;
};

export type ExerciseProgressEntry = {
  id: string;
  scheduledDate: string;
  setIndex: number;
  repsDone: number | null;
  weight: number | null;
};

export type ExerciseSummary = {
  exerciseId: string;
  exerciseName: string;
  lastScheduledDate: string;
  lastSessionSetCount: number;
};
