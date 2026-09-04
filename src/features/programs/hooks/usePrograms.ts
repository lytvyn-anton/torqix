import { useQuery } from '@tanstack/react-query';

import { getPrograms } from '../api/programsApi';

export function usePrograms(userId: string | undefined) {
  return useQuery({
    queryKey: ['programs', userId],
    queryFn: () => getPrograms(userId as string),
    enabled: !!userId,
  });
}
