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
  programDayId: string;
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
