import { useMutation, useQueryClient } from '@tanstack/react-query';

import { completeSession } from '../api/workoutsApi';

export function useCompleteSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => completeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySession', userId] });
    },
  });
}
