import { ProfileScreen } from '../../src/features/profile/screens/ProfileScreen';
import { useSession } from '../../src/shared/auth/SessionProvider';

export default function AppIndexRoute() {
  const { session } = useSession();
  if (!session) return null;
  return <ProfileScreen userId={session.user.id} />;
}
