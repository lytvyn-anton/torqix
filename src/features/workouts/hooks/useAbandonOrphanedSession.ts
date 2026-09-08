import { useMutation, useQueryClient } from '@tanstack/react-query';

import { abandonOrphanedSession } from '../api/workoutsApi';

export function useAbandonOrphanedSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => abandonOrphanedSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySession', userId] });
    },
  });
}
