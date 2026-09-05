import type { QueryClient } from '@tanstack/react-query';

// Every program mutation (create/update/delete) needs the list and active-program queries
// refetched; update/delete additionally need that specific program's own query key
// invalidated. Centralized so adding a new program-derived query key later — or fixing a
// missed one, as useDeleteProgram once did — only needs to happen here.
export function invalidateProgramQueries(
  queryClient: QueryClient,
  userId: string | undefined,
  programId?: string,
): void {
  queryClient.invalidateQueries({ queryKey: ['programs', userId] });
  queryClient.invalidateQueries({ queryKey: ['activeProgram', userId] });
  if (programId) {
    queryClient.invalidateQueries({ queryKey: ['program', programId] });
  }
}
