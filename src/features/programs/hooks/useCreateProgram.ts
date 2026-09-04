import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createProgram } from '../api/programsApi';
import type { CreateProgramInput } from '../types';

export function useCreateProgram(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProgramInput) => createProgram(userId as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', userId] });
      queryClient.invalidateQueries({ queryKey: ['activeProgram', userId] });
    },
  });
}
