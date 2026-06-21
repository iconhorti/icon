import { baseApi } from './baseApi';
import type { Project } from './projectsApi';

export interface Milestone {
  key:          string;
  label:        string;
  status:       'pending' | 'active' | 'completed';
  progress_pct: number;
  photos_count: number;
  signed_off:   boolean;
  signed_off_at?: string;
}

export interface SiteVisitInput {
  project_id?:  number;
  gps_lat:      number;
  gps_lng:      number;
  soil_type:    string;
  water_source: string;
  electricity:  boolean;
  road_access:  string;
  observations: string;
  submitted_at: string;
}

export interface DPRInput {
  project_id?:     number;
  milestone_key:   string;
  skilled_count:   number;
  unskilled_count: number;
  work_done:       string;
  materials_note:  string;
  submitted_at:    string;
}

export interface MilestoneUpdateInput {
  project_id:    number;
  milestone_key: string;
  progress_pct:  number;
  description:   string;
  version?:      number;   // concurrency token (optimistic locking)
  updated_at?:   string;
}

export const erectionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getErectionProjects: build.query<{ items: Project[]; total: number }, void>({
      query: () => ({ url: '/projects', params: { limit: 100 } }),
      providesTags: ['Projects'],
    }),
    getMilestones: build.query<Milestone[], number>({
      query: (projectId) => `/projects/${projectId}/milestones`,
      providesTags: (_r, _e, id) => [{ type: 'Projects' as const, id }],
    }),
    updateMilestone: build.mutation<Milestone, MilestoneUpdateInput>({
      query: ({ project_id, milestone_key, ...body }) => ({
        url:    `/projects/${project_id}/milestones/${milestone_key}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { project_id }) => [{ type: 'Projects' as const, id: project_id }],
    }),
    submitSiteVisit: build.mutation<{ id: number }, SiteVisitInput>({
      query: (body) => ({ url: '/site-visits', method: 'POST', body }),
      invalidatesTags: ['Projects'],
    }),
    submitDPR: build.mutation<{ id: number }, DPRInput>({
      query: (body) => ({ url: '/projects/dpr', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetErectionProjectsQuery,
  useGetMilestonesQuery,
  useUpdateMilestoneMutation,
  useSubmitSiteVisitMutation,
  useSubmitDPRMutation,
} = erectionApi;
