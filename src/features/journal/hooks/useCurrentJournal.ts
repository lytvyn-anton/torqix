import { useJournals } from './useJournals';
import type { JournalSummary } from '../types';

// The Home tab's Journal widget shows at most one journal — "the" current one, not a list
// (that's the Programs tab's Journals tab) — picked as the most recently created *active*
// journal. getJournals is already newest-first, so the first active row is it; an archived
// one is skipped rather than shown as if it were still current.
function pickCurrentJournal(journals: JournalSummary[]): JournalSummary | null {
  return journals.find((journal) => journal.status === 'active') ?? null;
}

export function useCurrentJournal(userId: string | undefined) {
  const journalsQuery = useJournals(userId);
  return {
    ...journalsQuery,
    data: journalsQuery.data ? pickCurrentJournal(journalsQuery.data) : journalsQuery.data,
  };
}
