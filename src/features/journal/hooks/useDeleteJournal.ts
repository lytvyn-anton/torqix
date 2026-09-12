import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteJournal } from '../api/journalApi';

export function useDeleteJournal(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (journalId: string) => deleteJournal(journalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journals', userId] }),
  });
}
