import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, getProjectById, getProjectStats, updateProjectStage, getProjectActivity } from '../api/client';
import { qk } from '../lib/queryClient';
import type { ProjectListItem } from '../types/models';
import type { ProjectActivity } from '../api/client';

/** Project list with optional server params (stage, limit, …). */
export function useProjects(params: Record<string, any> = {}) {
  return useQuery<{ items: ProjectListItem[]; total: number }>({
    queryKey: qk.projects(params),
    queryFn: async () => {
      const data = await getProjects(params);
      // Fallback for older API versions that return a plain array
      if (Array.isArray(data)) {
        return { items: data, total: data.length };
      }
      return data;
    },
  });
}

/**
 * Single project detail (ProjectDetail page). Cached per id so navigating away
 * and back doesn't always re-fetch, and other mutations (stage advance, field
 * updates, contractor assignment) can invalidate qk.project(id) to refresh it
 * instead of each caller having to know about a manual refetch callback.
 */
export function useProjectDetail(id: string | number | undefined) {
  return useQuery<any>({
    queryKey: qk.project(id ?? ''),
    queryFn: () => getProjectById(id as string),
    enabled: !!id,
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
export type DprPipelineKey = 'site_visit' | 'design_boq' | 'dpr_ready';
export type DprPipeline = Record<DprPipelineKey, ProjectListItem[]>;

function bucketItems(raw: { items?: ProjectListItem[] } | ProjectListItem[]): ProjectListItem[] {
  if (Array.isArray(raw)) return raw;
  return raw?.items ?? [];
}

export function useDprPipeline() {
  return useQuery<DprPipeline>({
    queryKey: qk.dprPipeline,
    queryFn: async () => {
      const [sv, db, dr] = await Promise.all([
        getProjects({ stage: 'site_visit', limit: 200 }),
        getProjects({ stage: 'design_boq', limit: 200 }),
        getProjects({ stage: 'dpr_ready',  limit: 200 }),
      ]);
      return {
        site_visit: bucketItems(sv),
        design_boq: bucketItems(db),
        dpr_ready: bucketItems(dr),
      };
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
