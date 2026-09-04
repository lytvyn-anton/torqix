import { supabase } from '../../../shared/api/supabase';
import type { Goal, Level, Profile, ProfileInput } from '../types';

type ProfileRow = {
  id: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  level: string | null;
  equipment: string[];
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
    equipment: row.equipment,
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
      session_minutes: input.sessionMinutes,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as ProfileRow);
}
