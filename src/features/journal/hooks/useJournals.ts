import { useQuery } from '@tanstack/react-query';

import { getJournals } from '../api/journalApi';

export function useJournals(userId: string | undefined) {
  return useQuery({
    queryKey: ['journals', userId],
    queryFn: () => getJournals(userId as string),
    enabled: !!userId,
  });
}
