import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser } from '../api/client';
import { qk } from '../lib/queryClient';
import type { Person } from '../types/models';

// A create/update can change any role list — invalidate them all so every screen
// (Users, Staff, Dealers, Contractors, Agronomists) re-syncs.
function invalidateUserLists(qc: QueryClient) {
  ['users', 'staff', 'dealers', 'contractors'].forEach((k) =>
    qc.invalidateQueries({ queryKey: [k] }),
  );
}

/** Generic user list. Pass a role to filter; omit for all. */
export function useUsers(role?: string) {
  return useQuery<Person[]>({
    queryKey: qk.users(role),
    queryFn: async () => {
      const data = await getUsers(role ? { role } : {});
      return Array.isArray(data) ? data : [];
    },
  });
}

// Office-staff sub-roles for the combined Staff screen.
const STAFF_ROLE_VALUES = ['office_staff', 'project_manager', 'bank_officer', 'agency_officer'];

/** Staff list across all staff sub-roles, or filtered to one. */
export function useStaff(roleFilter?: string) {
  return useQuery<Person[]>({
    queryKey: qk.staff(roleFilter),
    queryFn: async () => {
      const roles = roleFilter ? [roleFilter] : STAFF_ROLE_VALUES;
      const all = await Promise.all(roles.map((role) => getUsers({ role })));
      return (all as any[]).flat();
    },
  });
}

/** Create (when id is null) or update a user. Caller supplies the full payload. */
export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number | null; payload: Record<string, any> }) =>
      v.id ? updateUser(v.id, v.payload as any) : createUser(v.payload as any),
    onSuccess: () => invalidateUserLists(qc),
  });
}

/** Suspend / reactivate. */
export function useToggleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (u: any) => updateUser(u.id, { is_active: u.is_active ? 0 : 1 } as any),
    onSuccess: () => invalidateUserLists(qc),
  });
}
