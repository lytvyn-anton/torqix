import { useMutation } from '@tanstack/react-query';

import { logSets } from '../api/workoutsApi';
import type { LogSetInput } from '../types';

export function useLogSets(sessionId: string) {
  return useMutation({
    mutationFn: (inputs: LogSetInput[]) => logSets(sessionId, inputs),
  });
}
