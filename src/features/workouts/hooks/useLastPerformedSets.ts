import { useQuery } from '@tanstack/react-query';

import { getLastPerformedSets } from '../api/workoutsApi';

export function useLastPerformedSets(exerciseIds: string[]) {
  return useQuery({
    queryKey: ['lastPerformedSets', [...exerciseIds].sort()],
    queryFn: () => getLastPerformedSets(exerciseIds),
    enabled: exerciseIds.length > 0,
  });
}
