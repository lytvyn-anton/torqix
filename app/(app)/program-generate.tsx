import { useLocalSearchParams } from 'expo-router';

import { ProgramGenerateScreen } from '../../src/features/programs/screens/ProgramGenerateScreen';
import { useSession } from '../../src/shared/auth/SessionProvider';

export default function ProgramGenerateRoute() {
  const { session } = useSession();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  if (!session) return null;
  return (
    <ProgramGenerateScreen
      userId={session.user.id}
      intent={intent === 'journal' ? 'journal' : undefined}
    />
  );
}
