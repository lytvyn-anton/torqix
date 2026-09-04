import { supabase } from '../../../shared/api/supabase';
import type {
  Equipment,
  Goal,
  Level,
  Profile,
  ProfileInput,
  SplitPreference,
  TrainingLocation,
} from '../types';

type ProfileRow = {
  id: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  level: string | null;
  available_days_per_week: number | null;
  training_location: string | null;
  equipment: string[];
  split_preference: string | null;
  session_minutes: number | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    goal: row.goal as Goal | null,
    level: row.level as Level | null,
    availableDaysPerWeek: row.available_days_per_week,
    trainingLocation: row.training_location as TrainingLocation | null,
    equipment: row.equipment as Equipment[],
    splitPreference: row.split_preference as SplitPreference | null,
    sessionMinutes: row.session_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as ProfileRow) : null;
}

export async function upsertProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      age: input.age,
      height_cm: input.heightCm,
      weight_kg: input.weightKg,
      goal: input.goal,
      level: input.level,
      available_days_per_week: input.availableDaysPerWeek,
      training_location: input.trainingLocation,
      equipment: input.equipment,
      split_preference: input.splitPreference,
      session_minutes: input.sessionMinutes,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as ProfileRow);
}
