export const GOAL_OPTIONS = [
  'lose_weight',
  'build_muscle',
  'improve_endurance',
  'general_fitness',
] as const;
export type Goal = (typeof GOAL_OPTIONS)[number];

export const LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVEL_OPTIONS)[number];

export const TRAINING_LOCATION_OPTIONS = [
  'home_bodyweight',
  'home_equipped',
  'gym',
  'outdoor',
] as const;
export type TrainingLocation = (typeof TRAINING_LOCATION_OPTIONS)[number];

// Only relevant when trainingLocation is 'home_equipped' — "gym" and "home_bodyweight"/"outdoor"
// already imply their own equipment level without asking.
export const EQUIPMENT_OPTIONS = [
  'dumbbells',
  'barbell',
  'kettlebell',
  'resistance_bands',
  'pull_up_bar',
  'bench',
] as const;
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

export const SPLIT_PREFERENCE_OPTIONS = ['full_body', 'split', 'no_preference'] as const;
export type SplitPreference = (typeof SPLIT_PREFERENCE_OPTIONS)[number];

export type Profile = {
  id: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal | null;
  level: Level | null;
  availableDaysPerWeek: number | null;
  trainingLocation: TrainingLocation | null;
  equipment: Equipment[];
  splitPreference: SplitPreference | null;
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
  availableDaysPerWeek: number | null;
  trainingLocation: TrainingLocation | null;
  equipment: Equipment[];
  splitPreference: SplitPreference | null;
  sessionMinutes: number | null;
};
