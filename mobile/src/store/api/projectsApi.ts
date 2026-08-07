import { baseApi } from './baseApi';
import { mapProjectsResponse } from './transforms';

export interface ProjectFarmer {
  id:         number;
  first_name: string;
  last_name:  string | null;
  phone_primary?: string;
}

export interface Project {
  id:                          number;
  project_code:                string | null;
  project_name:                string | null;
  project_stage:               string;
  farmer?:                     ProjectFarmer;
  dealer?:                     ProjectFarmer;
  district?:                   string;
  village?:                    string;
  land_area?:                  number;
  land_unit?:                  string;
  total_project_cost?:         number;
  total_subsidy_amount_proposed?: number;
  loan_amount?:                number;
  loan_account_number?:        string | null;
  goc_number?:                 string | null;
  created_at:                  string;
  version?:                    number;
  updated_at?:                 string;
}

export interface ProjectsResponse {
  items: Project[];
  total: number;
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<ProjectsResponse, { stage?: string; limit?: number; offset?: number }>({
      query: (params) => ({ url: '/projects', params }),
      transformResponse: mapProjectsResponse,
      providesTags: ['Projects'],
    }),
    getProjectById: build.query<Project, number>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Projects', id }],
    }),
    updateProjectFields: build.mutation<Project, { id: number; fields: Partial<Project>; version?: number; updated_at?: string }>({
      query: ({ id, fields, version, updated_at }) => {
        const updates: Record<string, unknown> = { ...fields };
        if (version !== undefined) updates.version = version;
        if (updated_at) updates.updated_at = updated_at;
        return {
          url:    `/projects/${id}`,
          method: 'PATCH',
          body:   { updates },
        };
      },
      invalidatesTags: (_result, _err, { id }) => [{ type: 'Projects', id }, 'Stats'],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useUpdateProjectFieldsMutation,
} = projectsApi;
