import { ProgramGenerateScreen } from '../../src/features/programs/screens/ProgramGenerateScreen';
import { useSession } from '../../src/shared/auth/SessionProvider';

export default function ProgramGenerateRoute() {
  const { session } = useSession();
  if (!session) return null;
  return <ProgramGenerateScreen userId={session.user.id} />;
}
