import { useMutation } from '@tanstack/react-query';

import { resolveJournalForProgram } from '../api/journalApi';

export function useResolveProgramJournal(userId: string | undefined) {
  return useMutation({
    mutationFn: ({ programId, programName }: { programId: string; programName: string }) =>
      resolveJournalForProgram(userId as string, programId, programName),
  });
}
