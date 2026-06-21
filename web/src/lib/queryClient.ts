import { QueryClient } from '@tanstack/react-query';

// Shared QueryClient. Sensible defaults for an internal ERP: data stays "fresh"
// for 30s (no refetch storm on tab focus), retries once, and refetches in the
// background when a stale screen regains focus.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ─── Centralized query keys — avoids stringly-typed cache keys scattered around.
export const qk = {
  dealers: ['dealers'] as const,
  users: (role?: string) => ['users', role ?? 'all'] as const,
  staff: (role?: string) => ['staff', role ?? 'all'] as const,
  contractors: ['contractors'] as const,
  projects: (params?: Record<string, unknown>) => ['projects', params ?? {}] as const,
  project: (id: string | number) => ['project', String(id)] as const,
  farmers: (params?: Record<string, unknown>) => ['farmers', params ?? {}] as const,
  farmerStats: ['farmerStats'] as const,
  projectStats: ['projectStats'] as const,
  dprPipeline: ['dprPipeline'] as const,
  lookup: (tab: string) => ['lookup', tab] as const,
  locations: (level: string, filter?: Record<string, unknown>) => ['locations', level, filter ?? {}] as const,
  skills: ['skills'] as const,
  roleKpis: (role: string) => ['roleKpis', role] as const,
  notifications: (params?: Record<string, unknown>) => ['notifications', params ?? {}] as const,
};
