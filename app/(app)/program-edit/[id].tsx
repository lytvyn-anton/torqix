import { useLocalSearchParams } from 'expo-router';

import { ProgramEditScreen } from '../../../src/features/programs/screens/ProgramEditScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function ProgramEditRoute() {
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!session || !id) return null;
  return <ProgramEditScreen userId={session.user.id} programId={id} />;
}
