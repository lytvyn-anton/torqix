import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutCompleteScreen } from '../../src/features/workouts/screens/WorkoutCompleteScreen';

export default function WorkoutCompleteRoute() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  if (!sessionId) return null;

  return <WorkoutCompleteScreen sessionId={sessionId} onDone={() => router.back()} />;
}
