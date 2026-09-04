import { useMutation } from '@tanstack/react-query';

import { signInWithPassword } from '../api/authApi';

export function useSignIn() {
  return useMutation({
    mutationFn: signInWithPassword,
  });
}
