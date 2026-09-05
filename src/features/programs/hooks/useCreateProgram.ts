import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createProgram } from '../api/programsApi';
import { invalidateProgramQueries } from './invalidateProgramQueries';
import type { CreateProgramInput } from '../types';

export function useCreateProgram(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProgramInput) => createProgram(userId as string, input),
    onSuccess: () => invalidateProgramQueries(queryClient, userId),
  });
}
