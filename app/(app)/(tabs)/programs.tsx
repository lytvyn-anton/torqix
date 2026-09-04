import { ProgramsScreen } from '../../../src/features/programs/screens/ProgramsScreen';
import { useSession } from '../../../src/shared/auth/SessionProvider';

export default function ProgramsRoute() {
  const { session } = useSession();
  if (!session) return null;

  return <ProgramsScreen userId={session.user.id} />;
}
