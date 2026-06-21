import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getFarmers, getFarmerStats, createUser, updateFarmer, deleteFarmer } from '../api/client';
import { qk } from '../lib/queryClient';
import type { Person } from '../types/models';

function invalidateFarmers(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['farmers'] });
  qc.invalidateQueries({ queryKey: qk.farmerStats });
}

export function useFarmers(params: Record<string, any> = {}) {
  return useQuery<Person[]>({
    queryKey: qk.farmers(params),
    queryFn: async () => {
      const data = await getFarmers(params);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useFarmerStats() {
  return useQuery<any>({
    queryKey: qk.farmerStats,
    queryFn: () => getFarmerStats(),
  });
}

/** Create (id null → createUser) or update (id → updateFarmer). Caller supplies the right payload. */
export function useSaveFarmer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number | null; payload: Record<string, any> }) =>
      v.id ? updateFarmer(v.id, v.payload as any) : createUser(v.payload as any),
    onSuccess: () => invalidateFarmers(qc),
  });
}

export function useDeleteFarmer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteFarmer(id),
    onSuccess: () => invalidateFarmers(qc),
  });
}
