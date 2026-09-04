import { supabase } from '../../../shared/api/supabase';
import { signInWithPassword, signOut, signUpWithPassword } from './authApi';

jest.mock('../../../shared/api/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockedSignInWithPassword = jest.mocked(supabase.auth.signInWithPassword);
const mockedSignUp = jest.mocked(supabase.auth.signUp);
const mockedSignOut = jest.mocked(supabase.auth.signOut);

describe('signInWithPassword', () => {
  it('calls supabase with the given credentials', async () => {
    mockedSignInWithPassword.mockResolvedValue({ error: null } as never);

    await signInWithPassword({ email: 'a@b.com', password: 'secret1' });

    expect(mockedSignInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret1',
    });
  });

  it('throws the supabase error', async () => {
    const error = new Error('invalid credentials');
    mockedSignInWithPassword.mockResolvedValue({ error } as never);

    await expect(signInWithPassword({ email: 'a@b.com', password: 'wrong' })).rejects.toBe(error);
  });
});

describe('signUpWithPassword', () => {
  it('requires email confirmation when no session is returned', async () => {
    mockedSignUp.mockResolvedValue({
      data: { session: null, user: { identities: [{ id: '1' }] } },
      error: null,
    } as never);

    const result = await signUpWithPassword({ email: 'new@b.com', password: 'secret1' });

    expect(result).toEqual({ requiresEmailConfirmation: true, alreadyRegistered: false });
  });

  it('does not require confirmation when a session is returned immediately', async () => {
    mockedSignUp.mockResolvedValue({
      data: { session: {}, user: { identities: [{ id: '1' }] } },
      error: null,
    } as never);

    const result = await signUpWithPassword({ email: 'new@b.com', password: 'secret1' });

    expect(result.requiresEmailConfirmation).toBe(false);
  });

  it('flags an already-registered email via an empty identities array', async () => {
    mockedSignUp.mockResolvedValue({
      data: { session: null, user: { identities: [] } },
      error: null,
    } as never);

    const result = await signUpWithPassword({ email: 'existing@b.com', password: 'secret1' });

    expect(result.alreadyRegistered).toBe(true);
  });

  it('throws the supabase error', async () => {
    const error = new Error('weak password');
    mockedSignUp.mockResolvedValue({ data: { session: null, user: null }, error } as never);

    await expect(signUpWithPassword({ email: 'a@b.com', password: '1' })).rejects.toBe(error);
  });
});

describe('signOut', () => {
  it('resolves when supabase succeeds', async () => {
    mockedSignOut.mockResolvedValue({ error: null } as never);

    await expect(signOut()).resolves.toBeUndefined();
  });

  it('throws the supabase error', async () => {
    const error = new Error('network error');
    mockedSignOut.mockResolvedValue({ error } as never);

    await expect(signOut()).rejects.toBe(error);
  });
});
