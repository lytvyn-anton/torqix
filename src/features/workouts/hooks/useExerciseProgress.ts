import { useQuery } from '@tanstack/react-query';

import { getExerciseProgress } from '../api/workoutsApi';

export function useExerciseProgress(exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['exerciseProgress', exerciseId],
    queryFn: () => getExerciseProgress(exerciseId as string),
    enabled: !!exerciseId,
  });
}
