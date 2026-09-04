import { useQuery } from '@tanstack/react-query';

import { getActiveProgram } from '../api/programsApi';

export function useActiveProgram(userId: string | undefined) {
  return useQuery({
    queryKey: ['activeProgram', userId],
    queryFn: () => getActiveProgram(userId as string),
    enabled: !!userId,
  });
}
