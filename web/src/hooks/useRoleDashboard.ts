import { useQuery } from '@tanstack/react-query';
import { getProjectStats, getRoleKpis } from '../api/client';
import { qk } from '../lib/queryClient';
import { hasRole, ROLE_SETS } from '../lib/roles';

/**
 * Loads dashboard stats for every role, plus role-specific KPI packs for
 * admin/owner and manager-style roles (PM, bank, agency, agro, contractors).
 */
export function useRoleDashboard(role: string | undefined) {
  const statsQuery = useQuery({
    queryKey: qk.projectStats,
    queryFn: getProjectStats,
    enabled: !!role,
  });

  const wantsRoleKpis =
    !!role &&
    (hasRole(role, ROLE_SETS.DASHBOARD_MANAGER) ||
      hasRole(role, ROLE_SETS.DASHBOARD_ADMIN));

  const kpisQuery = useQuery({
    queryKey: qk.roleKpis(role ?? ''),
    queryFn: () => getRoleKpis(role as string),
    enabled: wantsRoleKpis,
  });

  return {
    stats: statsQuery.data ?? null,
    roleKpis: kpisQuery.data ?? null,
    loading: statsQuery.isLoading,
    kpisLoading: kpisQuery.isLoading,
    error: statsQuery.isError ? 'Failed to load dashboard stats.' : null,
  };
}
