import { useQuery } from '@tanstack/react-query';
import { getRoleKpis } from '../api/client';
import { qk } from '../lib/queryClient';

/** Role KPI panel data. `enabled=false` skips the fetch (e.g. unsupported role). */
export function useRoleKpis(role: string, enabled = true) {
  return useQuery<any>({
    queryKey: qk.roleKpis(role),
    queryFn: () => getRoleKpis(role),
    enabled: enabled && !!role,
  });
}
