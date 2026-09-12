import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setJournalStatus } from '../api/journalApi';

export function useSetJournalStatus(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ journalId, status }: { journalId: string; status: 'active' | 'archived' }) =>
      setJournalStatus(journalId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journals', userId] }),
  });
}
