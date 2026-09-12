import { useMutation, useQueryClient } from '@tanstack/react-query';

import { resolveJournalForProgram } from '../api/journalApi';

export function useResolveProgramJournal(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, programName }: { programId: string; programName: string }) =>
      resolveJournalForProgram(userId as string, programId, programName),
    // Lets useJournalForProgram (JournalWidgetCard's "no journal yet" check) pick up a
    // freshly created journal instead of continuing to show the empty state until some
    // unrelated refetch happens to run.
    onSuccess: (_journal, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['journalForProgram', userId, programId] });
    },
  });
}
