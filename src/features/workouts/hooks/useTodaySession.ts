import { useQuery } from '@tanstack/react-query';

import { getTodaySession } from '../api/workoutsApi';

export function useTodaySession(userId: string | undefined) {
  return useQuery({
    queryKey: ['todaySession', userId],
    queryFn: () => getTodaySession(userId as string),
    enabled: !!userId,
  });
}
