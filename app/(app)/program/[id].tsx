import { useLocalSearchParams } from 'expo-router';

import { ProgramDetailScreen } from '../../../src/features/programs/screens/ProgramDetailScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function ProgramDetailRoute() {
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!session || !id) return null;
  return <ProgramDetailScreen userId={session.user.id} programId={id} />;
}
