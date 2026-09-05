import { useRouter } from 'expo-router';

import { TodayScreen } from '../../../src/features/today/screens/TodayScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function TodayRoute() {
  const { session } = useSession();
  const router = useRouter();
  if (!session) return null;

  return (
    <TodayScreen userId={session.user.id} onCreateProgram={() => router.push('/program-create')} />
  );
}
