export const GOAL_OPTIONS = [
  'lose_weight',
  'build_muscle',
  'improve_endurance',
  'general_fitness',
] as const;
export type Goal = (typeof GOAL_OPTIONS)[number];

export const LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVEL_OPTIONS)[number];

export const EQUIPMENT_OPTIONS = [
  'bodyweight',
  'dumbbells',
  'barbell',
  'kettlebell',
  'resistance_bands',
  'pull_up_bar',
  'bench',
  'full_gym',
] as const;
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

export type Profile = {
  id: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal | null;
  level: Level | null;
  equipment: Equipment[];
  sessionMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileInput = {
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal | null;
  level: Level | null;
  equipment: Equipment[];
  sessionMinutes: number | null;
};
