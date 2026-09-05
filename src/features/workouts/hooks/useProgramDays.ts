import { useQuery } from '@tanstack/react-query';

import { getProgramDays } from '../api/workoutsApi';

export function useProgramDays(programId: string | undefined) {
  return useQuery({
    queryKey: ['programDays', programId],
    queryFn: () => getProgramDays(programId as string),
    enabled: !!programId,
  });
}
