import { useQuery } from '@tanstack/react-query';

import { getJournalEntries } from '../api/journalApi';

export function useJournalEntries(journalId: string | undefined) {
  return useQuery({
    queryKey: ['journalEntries', journalId],
    queryFn: () => getJournalEntries(journalId as string),
    enabled: !!journalId,
  });
}
