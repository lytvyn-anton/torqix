import { useQuery } from '@tanstack/react-query';

import { getJournalForProgram } from '../api/journalApi';

// Read-only existence check (unlike useResolveProgramJournal, which creates one) — lets a
// caller show "no journal yet" honestly instead of implying one already exists just because
// a program does.
export function useJournalForProgram(userId: string | undefined, programId: string | undefined) {
  return useQuery({
    queryKey: ['journalForProgram', userId, programId],
    queryFn: () => getJournalForProgram(userId as string, programId as string),
    enabled: !!userId && !!programId,
  });
}
