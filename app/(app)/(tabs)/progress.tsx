import { ProgressScreen } from '../../../src/features/progress/screens/ProgressScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function ProgressRoute() {
  const { session } = useSession();
  if (!session) return null;

  return <ProgressScreen userId={session.user.id} />;
}
