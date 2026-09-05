import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelSession } from '../api/workoutsApi';

export function useCancelSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => cancelSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySession', userId] });
    },
  });
}
