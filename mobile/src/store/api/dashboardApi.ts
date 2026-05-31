import { baseApi } from './baseApi';

export interface AdminMetrics {
  region_data:    Array<{ name: string; count: number }>;
  area_data:      Array<{ name: string; count: number }>;
  kpis:           Record<string, number>;
  pipeline_stack: Array<Record<string, number | string>>;
}

export interface DealerMetrics {
  funnel_data:   Array<{ name: string; value: number; fill: string }>;
  leaderboard:   Array<{ name: string; projects: number; isMe: boolean; location: string }>;
  district_data: Array<{ name: string; count: number }>;
  commission:    { earned: number; pending: number; rate_pct: number };
}

export interface MyProject {
  id:                      number;
  project_code:            string;
  project_name:            string;
  project_stage:           string;
  land_area:               number | null;
  land_unit:               string;
  area_type:               string | null;
  crop_category:           string | null;
  village:                 string | null;
  taluka:                  string | null;
  district:                string | null;
  estimated_project_cost:  number;
  total_subsidy_proposed:  number;
  total_eligible_cost:     number;
  created_at:              string | null;
  actual_start_date:       string | null;
  expected_end_date:       string | null;
}

export interface DashboardStats {
  total_projects:          number;
  total_farmers:           number;
  active_sites:            number;
  pending_subsidy:         number;
  completed:               number;
  total_eligible_cost:     number;
  total_subsidy_proposed:  number;
  total_subsidy_received:  number;
  stage_breakdown:         Record<string, number>;
  role_counts:             Record<string, number>;
  admin_metrics:           AdminMetrics;
  dealer_metrics:          DealerMetrics;
  my_project:              MyProject | null;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStats: build.query<DashboardStats, void>({
      query: () => '/dashboard/stats',
      providesTags: ['Stats'],
    }),
  }),
});

export const { useGetStatsQuery } = dashboardApi;
