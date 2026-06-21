import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole, type Role } from '../lib/roles';

/**
 * Hook form — call at the top of a page component.
 * Returns a <Navigate> element to render-and-return when access is denied,
 * or null when the current user is allowed.
 *
 *   const denied = useRequireRole(ROLE_SETS.INTERNAL_STAFF);
 *   if (denied) return denied;
 */
export function useRequireRole(allowed: readonly Role[], redirectTo = '/'): ReactNode | null {
  const { user } = useAuth();
  if (!hasRole(user?.role, allowed)) return <Navigate to={redirectTo} replace />;
  return null;
}

/**
 * Wrapper form — used in route definitions.
 *
 *   <RequireRole allowed={ROLE_SETS.ADMIN_ONLY}><Users /></RequireRole>
 */
export function RequireRole({
  allowed,
  children,
  redirectTo = '/',
  unauthenticatedTo = '/login',
}: {
  allowed: readonly Role[];
  children: ReactNode;
  redirectTo?: string;
  unauthenticatedTo?: string;
}) {
  const { user } = useAuth();
  if (!user?.role) return <Navigate to={unauthenticatedTo} replace />;
  return hasRole(user.role, allowed) ? <>{children}</> : <Navigate to={redirectTo} replace />;
}
