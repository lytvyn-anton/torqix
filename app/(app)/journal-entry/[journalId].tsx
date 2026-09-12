import { useLocalSearchParams } from 'expo-router';

import { JournalEntryScreen } from '../../../src/features/journal/screens/JournalEntryScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function JournalEntryRoute() {
  const { session } = useSession();
  const { journalId, dayId } = useLocalSearchParams<{ journalId: string; dayId?: string }>();
  if (!session || !journalId) return null;
  return <JournalEntryScreen userId={session.user.id} journalId={journalId} initialDayId={dayId} />;
}
