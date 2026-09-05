import { useLocalSearchParams } from 'expo-router';

import { ExerciseProgressScreen } from '../../../src/features/progress/screens/ExerciseProgressScreen';

export default function ExerciseProgressRoute() {
  const { exerciseId, name } = useLocalSearchParams<{ exerciseId: string; name: string }>();
  if (!exerciseId) return null;
  return <ExerciseProgressScreen exerciseId={exerciseId} exerciseName={name ?? ''} />;
}
