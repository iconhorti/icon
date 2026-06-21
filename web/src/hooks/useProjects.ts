import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, getProjectStats, updateProjectStage, getProjectActivity } from '../api/client';
import { qk } from '../lib/queryClient';
import type { ProjectListItem } from '../types/models';
import type { ProjectActivity } from '../api/client';

/** Project list with optional server params (stage, limit, …). */
export function useProjects(params: Record<string, any> = {}) {
  return useQuery<ProjectListItem[]>({
    queryKey: qk.projects(params),
    queryFn: async () => {
      const data = await getProjects(params);
      return Array.isArray(data) ? data : [];
    },
  });
}

/** Aggregate project statistics for the Reports screen. */
export function useProjectStats() {
  return useQuery<any>({
    queryKey: qk.projectStats,
    queryFn: () => getProjectStats(),
  });
}

/** The three early-stage buckets shown in the Office-Staff DPR workflow tab. */
export function useDprPipeline() {
  return useQuery<Record<string, any[]>>({
    queryKey: qk.dprPipeline,
    queryFn: async () => {
      const [sv, db, dr] = await Promise.all([
        getProjects({ stage: 'site_visit', limit: 200 }),
        getProjects({ stage: 'design_boq', limit: 200 }),
        getProjects({ stage: 'dpr_ready',  limit: 200 }),
      ]);
      return { site_visit: sv, design_boq: db, dpr_ready: dr };
    },
  });
}

/**
 * Project audit trail. Degrades gracefully: if the backend endpoint isn't live
 * yet (404), the query resolves to `[]` instead of erroring, and we don't retry
 * a missing route. `notImplemented` lets the UI show a "coming soon" hint.
 */
export function useProjectActivity(id: string | number | undefined) {
  const query = useQuery<ProjectActivity[]>({
    queryKey: ['projectActivity', String(id)],
    enabled: !!id,
    retry: (count, err: any) => {
      const status = err?.response?.status;
      if (status === 404 || status === 501) return false; // endpoint not deployed
      return count < 1;
    },
    queryFn: async () => {
      try {
        return await getProjectActivity(id as string);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 501) return []; // treat as "no data yet"
        throw err;
      }
    },
  });
  const status = (query.error as any)?.response?.status;
  return { ...query, notImplemented: status === 404 || status === 501 };
}

/** Advance a project to the next stage; refreshes the pipeline + project lists. */
export function useAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { projectId: number; nextStage: string }) =>
      updateProjectStage(v.projectId, v.nextStage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.dprPipeline });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
