import { useQuery } from '@tanstack/react-query';

import { getProgramDayExercises } from '../api/workoutsApi';

export function useProgramDayExercises(programDayId: string | undefined) {
  return useQuery({
    queryKey: ['programDayExercises', programDayId],
    queryFn: () => getProgramDayExercises(programDayId as string),
    enabled: !!programDayId,
  });
}
