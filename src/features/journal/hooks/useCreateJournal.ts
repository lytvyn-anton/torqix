import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createJournal } from '../api/journalApi';

// A plain create — no resolve-or-reuse (see useResolveProgramJournal for that) — since a
// blank journal has no program to look up an existing one against; a second tap just makes a
// second blank journal, manageable from the Programs tab's Journals list.
export function useCreateJournal(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { programId: string | null; name: string }) =>
      createJournal(userId as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals', userId] });
    },
  });
}
