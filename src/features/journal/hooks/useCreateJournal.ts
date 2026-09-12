import { useMutation } from '@tanstack/react-query';

import { createJournal } from '../api/journalApi';

export function useCreateJournal(userId: string | undefined) {
  return useMutation({
    mutationFn: (input: { programId: string | null; name: string }) =>
      createJournal(userId as string, input),
  });
}
