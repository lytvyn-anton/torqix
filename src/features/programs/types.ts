export type ActiveProgram = {
  id: string;
  name: string;
};

export type Program = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
};

export type ProgramDayExerciseInput = {
  exerciseId: string;
  sets: number | null;
  reps: number | null;
  targetWeight: number | null;
};

export type ProgramDayInput = {
  name: string;
  exercises: ProgramDayExerciseInput[];
};

// Manual creation input: a name plus a list of days, each with its own name and the
// exercises assigned to it (picked via the Exercise picker screen).
export type CreateProgramInput = {
  name: string;
  days: ProgramDayInput[];
};
