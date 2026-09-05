import { useQuery } from '@tanstack/react-query';

import { getExercises } from '../api/exercisesApi';

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
    // The catalog barely changes (a few custom exercises at most) — avoid refetching it
    // on every ProgramCreateScreen mount/remount.
    staleTime: 5 * 60 * 1000,
  });
}
