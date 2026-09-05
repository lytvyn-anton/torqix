import { useQuery } from '@tanstack/react-query';

import { getWorkoutHistory } from '../api/workoutsApi';

export function useWorkoutHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['workoutHistory', userId],
    queryFn: () => getWorkoutHistory(userId as string),
    enabled: !!userId,
  });
}
