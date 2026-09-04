import { useMutation } from '@tanstack/react-query';

import { signOut } from '../api/authApi';

export function useSignOut() {
  return useMutation({
    mutationFn: signOut,
  });
}
