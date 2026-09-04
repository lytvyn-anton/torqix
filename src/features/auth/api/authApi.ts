import { supabase } from '../../../shared/api/supabase';

export type AuthCredentials = {
  email: string;
  password: string;
};

export async function signInWithPassword({ email, password }: AuthCredentials) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export type SignUpResult = {
  requiresEmailConfirmation: boolean;
  alreadyRegistered: boolean;
};

export async function signUpWithPassword({
  email,
  password,
}: AuthCredentials): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Supabase deliberately returns no error for an email that's already registered (to avoid
  // leaking which emails have accounts) — it responds as if a new signup succeeded, but with
  // an empty identities array on the returned user. That's the only signal to tell the two
  // cases apart client-side.
  const alreadyRegistered = data.user?.identities?.length === 0;
  return { requiresEmailConfirmation: data.session === null, alreadyRegistered };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
