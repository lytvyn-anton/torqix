import { useQuery } from '@tanstack/react-query';

import { getSession } from '../api/workoutsApi';

// Named to avoid colliding with the auth SessionProvider's useSession.
export function useWorkoutSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['workoutSession', sessionId],
    queryFn: () => getSession(sessionId as string),
    enabled: !!sessionId,
  });
}
