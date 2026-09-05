import { useMutation, useQueryClient } from '@tanstack/react-query';

import { logSet } from '../api/workoutsApi';
import type { LogSetInput } from '../types';

export function useLogSet(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogSetInput) => logSet(sessionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setLogs', sessionId] });
    },
  });
}
