import { HistoryScreen } from '../../../src/features/history/screens/HistoryScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function HistoryRoute() {
  const { session } = useSession();
  if (!session) return null;

  return <HistoryScreen userId={session.user.id} />;
}
