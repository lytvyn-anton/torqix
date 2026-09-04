import { validateEmail, validatePassword } from './validation';

describe('validateEmail', () => {
  it('rejects an empty email', () => {
    expect(validateEmail('')).toBe('auth.errors.emailRequired');
  });

  it('rejects a malformed email', () => {
    expect(validateEmail('not-an-email')).toBe('auth.errors.emailInvalid');
  });

  it('accepts a valid email', () => {
    expect(validateEmail('user@example.com')).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('rejects an empty password', () => {
    expect(validatePassword('')).toBe('auth.errors.passwordRequired');
  });

  it('rejects a password shorter than 6 characters', () => {
    expect(validatePassword('abc')).toBe('auth.errors.passwordTooShort');
  });

  it('accepts a valid password', () => {
    expect(validatePassword('abcdef')).toBeUndefined();
  });
});
