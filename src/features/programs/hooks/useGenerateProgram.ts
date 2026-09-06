import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateProgram } from '../api/programsApi';
import { invalidateProgramQueries } from './invalidateProgramQueries';

export function useGenerateProgram(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateProgram,
    onSuccess: () => invalidateProgramQueries(queryClient, userId),
  });
}
