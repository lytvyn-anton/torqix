import { useQuery } from '@tanstack/react-query';

import { getLoggedExercises } from '../api/journalApi';

export function useLoggedExercises(userId: string) {
  return useQuery({
    queryKey: ['loggedExercises', userId],
    queryFn: () => getLoggedExercises(userId),
  });
}
