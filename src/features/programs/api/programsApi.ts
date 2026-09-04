import { supabase } from '../../../shared/api/supabase';
import type { ActiveProgram, Program } from '../types';

// "Active" is whichever of the user's non-template, status='active' programs was created
// most recently. Program creation isn't built yet (see the "Manual workout program
// creation screen" task), so this currently always resolves to null — that's expected,
// not a bug: it's what drives Today's empty state.
export async function getActiveProgram(userId: string): Promise<ActiveProgram | null> {
  const { data, error } = await supabase
    .from('workout_programs')
    .select('id, name')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// All of a user's own (non-template) programs, newest first — the Programs tab's list.
export async function getPrograms(userId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('workout_programs')
    .select('id, name, status, created_at')
    .eq('user_id', userId)
    .eq('is_template', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
  }));
}
