import { useQuery } from '@tanstack/react-query';

import { getProgram } from '../api/programsApi';

export function useProgram(programId: string | undefined) {
  return useQuery({
    queryKey: ['program', programId],
    queryFn: () => getProgram(programId as string),
    enabled: !!programId,
  });
}
