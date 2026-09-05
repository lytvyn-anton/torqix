import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProgram } from '../api/programsApi';
import { invalidateProgramQueries } from './invalidateProgramQueries';
import type { CreateProgramInput } from '../types';

export function useUpdateProgram(userId: string | undefined, programId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProgramInput) => updateProgram(programId as string, input),
    onSuccess: () => invalidateProgramQueries(queryClient, userId, programId),
  });
}
