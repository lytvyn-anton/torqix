import { useQuery } from '@tanstack/react-query';

import { getLastPerformedJournalSets } from '../api/journalApi';

export function useLastPerformedJournalSets(exerciseIds: string[]) {
  return useQuery({
    queryKey: ['lastPerformedJournalSets', [...exerciseIds].sort()],
    queryFn: () => getLastPerformedJournalSets(exerciseIds),
    enabled: exerciseIds.length > 0,
  });
}
