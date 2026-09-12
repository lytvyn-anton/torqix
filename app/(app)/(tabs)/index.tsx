import { HomeScreen } from '../../../src/features/home/screens/HomeScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function HomeRoute() {
  const { session } = useSession();
  if (!session) return null;

  return <HomeScreen userId={session.user.id} />;
}
