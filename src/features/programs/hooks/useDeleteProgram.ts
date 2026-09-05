import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteProgram } from '../api/programsApi';
import { invalidateProgramQueries } from './invalidateProgramQueries';

export function useDeleteProgram(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) => deleteProgram(programId),
    onSuccess: (_data, programId) => invalidateProgramQueries(queryClient, userId, programId),
  });
}
