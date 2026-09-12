import { ProgramCreateScreen } from '../../src/features/programs/screens/ProgramCreateScreen';
import { useSession } from '../../src/shared/auth/SessionProvider';

export default function ProgramCreateRoute() {
  const { session } = useSession();
  if (!session) return null;
  return <ProgramCreateScreen userId={session.user.id} />;
}
