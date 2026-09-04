import { supabase } from '../../../shared/api/supabase';
import type { ActiveProgram } from '../types';

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
