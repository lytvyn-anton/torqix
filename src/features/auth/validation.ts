const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export type AuthFormErrorKey =
  | 'auth.errors.emailRequired'
  | 'auth.errors.emailInvalid'
  | 'auth.errors.passwordRequired'
  | 'auth.errors.passwordTooShort';

export function validateEmail(email: string): AuthFormErrorKey | undefined {
  if (!email.trim()) return 'auth.errors.emailRequired';
  if (!EMAIL_PATTERN.test(email.trim())) return 'auth.errors.emailInvalid';
  return undefined;
}

export function validatePassword(password: string): AuthFormErrorKey | undefined {
  if (!password) return 'auth.errors.passwordRequired';
  if (password.length < MIN_PASSWORD_LENGTH) return 'auth.errors.passwordTooShort';
  return undefined;
}
