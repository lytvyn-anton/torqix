import { useQuery } from '@tanstack/react-query';

import { getJournalDays } from '../api/journalApi';

export function useJournalDays(journalId: string | undefined) {
  return useQuery({
    queryKey: ['journalDays', journalId],
    queryFn: () => getJournalDays(journalId as string),
    enabled: !!journalId,
  });
}
