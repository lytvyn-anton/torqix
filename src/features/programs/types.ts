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
  // Set when editing an existing day (carried through from ProgramDetailDay.id) so
  // updateProgram can match it back to its DB row by primary key instead of by name —
  // absent for a day added fresh in the form, which always gets an inserted row.
  id?: string;
  name: string;
  exercises: ProgramDayExerciseInput[];
};

// Manual creation input: a name plus a list of days, each with its own name and the
// exercises assigned to it (picked via the Exercise picker screen). Also what an edit
// saves back — updateProgram takes the same shape and replaces the program's days wholesale.
export type CreateProgramInput = {
  name: string;
  days: ProgramDayInput[];
};

export type ProgramDetailExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  targetWeight: number | null;
};

export type ProgramDetailDay = {
  id: string;
  name: string;
  exercises: ProgramDetailExercise[];
};

// The full shape of a single program, for the detail/edit screens — name/days/exercises,
// with days and their exercises ordered per their order_index.
export type ProgramDetail = Program & {
  days: ProgramDetailDay[];
};
