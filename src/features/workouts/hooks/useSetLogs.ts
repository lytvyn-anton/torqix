import { useQuery } from '@tanstack/react-query';

import { getSetLogs } from '../api/workoutsApi';

export function useSetLogs(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['setLogs', sessionId],
    queryFn: () => getSetLogs(sessionId as string),
    enabled: !!sessionId,
  });
}
