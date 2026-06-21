import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers, getContractorSkills, getSkills } from '../api/client';
import { qk } from '../lib/queryClient';

// Contractor sub-roles (kept here so the hook is self-contained).
const CONTRACTOR_ROLE_VALUES = [
  'structure_contractor', 'drip_contractor', 'bed_contractor', 'plantation_contractor',
];

export interface ContractorsData {
  contractors: any[];
  skillMap: Record<string, any[]>;
}

/**
 * Loads contractors (optionally filtered to one sub-role) plus each contractor's
 * skill tags. The N+1 skill fetch is encapsulated here so the page just reads
 * `data.contractors` / `data.skillMap`.
 */
export function useContractors(roleFilter?: string) {
  return useQuery<ContractorsData>({
    queryKey: [...qk.contractors, roleFilter ?? 'all'],
    queryFn: async () => {
      const roles = roleFilter ? [roleFilter] : CONTRACTOR_ROLE_VALUES;
      const all = await Promise.all(roles.map((role) => getUsers({ role })));
      const contractors = (all as any[]).flat();
      const skillMap: Record<string, any[]> = {};
      await Promise.all(
        contractors.map(async (c: any) => {
          try { skillMap[c.id] = (await getContractorSkills(c.id)) || []; }
          catch { skillMap[c.id] = []; }
        }),
      );
      return { contractors, skillMap };
    },
  });
}

export function useSkills() {
  return useQuery<any[]>({
    queryKey: qk.skills,
    queryFn: async () => {
      const data = await getSkills();
      return Array.isArray(data) ? data : [];
    },
  });
}

/** Returns a function that invalidates all contractor lists (after a save/toggle). */
export function useInvalidateContractors() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.contractors });
}
