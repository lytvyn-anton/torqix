import { useRouter } from 'expo-router';

import { HomeScreen } from '../../../src/features/home/screens/HomeScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function HomeRoute() {
  const { session } = useSession();
  const router = useRouter();
  if (!session) return null;

  return (
    <HomeScreen
      userId={session.user.id}
      onCreateProgram={() => router.push('/program-create?intent=journal')}
      onGenerateProgram={() => router.push('/program-generate?intent=journal')}
    />
  );
}
