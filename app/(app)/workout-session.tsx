import { useLocalSearchParams, useRouter } from 'expo-router';

import { SetLoggingScreen } from '../../src/features/workouts/screens/SetLoggingScreen';
import { useSession } from '../../src/shared/auth/SessionProvider';

export default function WorkoutSessionRoute() {
  const { session } = useSession();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  if (!session || !sessionId) return null;

  return (
    <SetLoggingScreen
      userId={session.user.id}
      sessionId={sessionId}
      onCancelled={() => router.back()}
      onCompleted={(completedSessionId) =>
        router.replace({ pathname: '/workout-complete', params: { sessionId: completedSessionId } })
      }
    />
  );
}
