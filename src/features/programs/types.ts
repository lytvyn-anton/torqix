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

// Manual creation input: a name plus a list of day names (e.g. "Push day"). No exercises
// yet — that's the separate Exercise picker task, once the exercise catalog is seeded.
export type CreateProgramInput = {
  name: string;
  days: string[];
};
