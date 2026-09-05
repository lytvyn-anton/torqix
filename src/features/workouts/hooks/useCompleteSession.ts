import { useMutation, useQueryClient } from '@tanstack/react-query';

import { completeSession } from '../api/workoutsApi';

export function useCompleteSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => completeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySession', userId] });
      // A session flipping to "done" is what first exposes its set_logs to
      // getLoggedExercises (scoped to status: 'done') — without this, the Progress tab can
      // keep showing stale data (e.g. missing an exercise, or an outdated last-session count)
      // after finishing a workout.
      queryClient.invalidateQueries({ queryKey: ['loggedExercises', userId] });
    },
  });
}
