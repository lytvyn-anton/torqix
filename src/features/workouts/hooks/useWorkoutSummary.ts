import { useQuery } from '@tanstack/react-query';

import { getWorkoutSummary } from '../api/workoutsApi';

export function useWorkoutSummary(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['workoutSummary', sessionId],
    queryFn: () => getWorkoutSummary(sessionId as string),
    enabled: !!sessionId,
  });
}
