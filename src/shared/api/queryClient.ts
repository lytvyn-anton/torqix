import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error(`Query failed: ${query.queryKey.join('/')}`, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const name = mutation.options.mutationFn?.name || 'mutation';
      console.error(`Mutation failed: ${name}`, error);
    },
  }),
});
