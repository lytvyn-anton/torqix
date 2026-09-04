import { useState } from 'react';

import type { AuthCredentials } from '../api/authApi';
import { validateEmail, validatePassword, type AuthFormErrorKey } from '../validation';

export function useAuthForm(mutate: (credentials: AuthCredentials) => void) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<AuthFormErrorKey | undefined>();

  const handleSubmit = () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const error = emailError ?? passwordError;
    setFieldError(error);
    if (error) return;

    mutate({ email: email.trim(), password });
  };

  return { email, setEmail, password, setPassword, fieldError, handleSubmit };
}
