import { baseApi } from './baseApi';

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
}

export interface ProjectsResponse {
  items: Project[];
  total: number;
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<ProjectsResponse, { stage?: string; limit?: number; offset?: number }>({
      query: (params) => ({ url: '/projects', params }),
      providesTags: ['Projects'],
    }),
    getProjectById: build.query<Project, number>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Projects', id }],
    }),
    updateProjectFields: build.mutation<Project, { id: number; fields: Partial<Project> }>({
      query: ({ id, fields }) => ({
        url:    `/projects/${id}/fields`,
        method: 'PATCH',
        body:   fields,
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: 'Projects', id }, 'Stats'],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useUpdateProjectFieldsMutation,
} = projectsApi;
