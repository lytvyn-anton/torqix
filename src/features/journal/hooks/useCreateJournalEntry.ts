import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createJournalEntry } from '../api/journalApi';
import { invalidateJournalQueries } from './invalidateJournalQueries';
import type { CreateJournalEntryInput } from '../types';

export function useCreateJournalEntry(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJournalEntryInput) => createJournalEntry(userId, input),
    onSuccess: (_data, input) => invalidateJournalQueries(queryClient, input.journalId, userId),
  });
}
