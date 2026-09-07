import { useMutation } from '@tanstack/react-query';

import { syncSetLogs } from '../api/workoutsApi';
import type { LogSetInput } from '../types';

export function useSyncSetLogs(sessionId: string) {
  return useMutation({
    mutationFn: ({ allExerciseIds, inputs }: { allExerciseIds: string[]; inputs: LogSetInput[] }) =>
      syncSetLogs(sessionId, allExerciseIds, inputs),
  });
}
