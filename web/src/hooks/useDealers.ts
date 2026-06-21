import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDealers, createUser, updateUser } from '../api/client';
import { qk } from '../lib/queryClient';
import type { Person } from '../types/models';

/**
 * Reference pattern for server-state hooks (replaces hand-rolled
 * loading/error/refetch in pages). Caching, dedupe, and background refresh are
 * handled by TanStack Query; the page just consumes `data` + `isLoading`.
 */
export function useDealers() {
  return useQuery<Person[]>({
    queryKey: qk.dealers,
    queryFn: () => getDealers(),
  });
}

export function useSaveDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number | null; payload: Record<string, any> }) =>
      vars.id
        ? updateUser(vars.id, vars.payload as any)
        : createUser({ ...vars.payload, role: 'dealer' } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dealers }),
  });
}

export function useToggleDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: any) => updateUser(d.id, { is_active: d.is_active ? 0 : 1 } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dealers }),
  });
}
