import { useQuery } from '@tanstack/react-query';

import { getJournal } from '../api/journalApi';

export function useJournal(journalId: string | undefined) {
  return useQuery({
    queryKey: ['journal', journalId],
    queryFn: () => getJournal(journalId as string),
    enabled: !!journalId,
  });
}
