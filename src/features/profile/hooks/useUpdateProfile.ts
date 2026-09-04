import { useMutation, useQueryClient } from '@tanstack/react-query';

import { upsertProfile } from '../api/profileApi';
import type { ProfileInput } from '../types';

export function useUpdateProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProfileInput) => upsertProfile(userId as string, input),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile', userId], profile);
    },
  });
}
