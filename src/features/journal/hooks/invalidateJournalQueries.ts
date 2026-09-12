import type { QueryClient } from '@tanstack/react-query';

// Saving a journal entry needs its own journal's entry list refetched, plus every
// exercise-scoped query that a newly logged set could change — Progress tab's exercise list
// and per-exercise charts, and the "last time" prefill for the next entry logged against any
// of the same exercises. The latter two are broad-invalidated by query-key prefix rather than
// the caller enumerating the exact exercise ids touched, since a saved entry can span several
// exercises at once.
export function invalidateJournalQueries(
  queryClient: QueryClient,
  journalId: string,
  userId: string | undefined,
): void {
  queryClient.invalidateQueries({ queryKey: ['journalEntries', journalId] });
  queryClient.invalidateQueries({ queryKey: ['loggedExercises', userId] });
  queryClient.invalidateQueries({ queryKey: ['exerciseProgress'] });
  queryClient.invalidateQueries({ queryKey: ['lastPerformedJournalSets'] });
}
