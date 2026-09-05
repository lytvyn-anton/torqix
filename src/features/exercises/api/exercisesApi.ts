import { supabase } from '../../../shared/api/supabase';
import type { Exercise } from '../types';

// RLS (exercises_select_catalog_and_own) already scopes this to the shared catalog plus
// the caller's own custom exercises — no user_id filter needed client-side.
export async function getExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, equipment')
    .order('name', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
  }));
}
