import { useMutation } from '@tanstack/react-query';

import { signUpWithPassword } from '../api/authApi';

export function useSignUp() {
  return useMutation({
    mutationFn: signUpWithPassword,
  });
}
