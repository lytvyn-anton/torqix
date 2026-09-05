import { useMutation, useQueryClient } from '@tanstack/react-query';

import { startWorkoutSession } from '../api/workoutsApi';

export function useStartWorkoutSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programDayId: string) => startWorkoutSession(userId as string, programDayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySession', userId] });
    },
  });
}
