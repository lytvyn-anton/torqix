import { useLocalSearchParams } from 'expo-router';

import { JournalScreen } from '../../../src/features/journal/screens/JournalScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function JournalRoute() {
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!session || !id) return null;
  return <JournalScreen journalId={id} />;
}
