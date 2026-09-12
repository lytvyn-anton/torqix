import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setProgramStatus } from '../api/programsApi';
import { invalidateProgramQueries } from './invalidateProgramQueries';

export function useSetProgramStatus(userId: string | undefined, programId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: 'active' | 'archived') => setProgramStatus(programId as string, status),
    onSuccess: () => invalidateProgramQueries(queryClient, userId, programId),
  });
}
