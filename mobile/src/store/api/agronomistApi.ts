import { baseApi } from './baseApi';

export interface Farm {
  id:           number;
  project_id:   number;
  farmer_name:  string;
  village:      string;
  district:     string;
  crop_type:    string;
  dap:          number;
  area_acres:   number;
  last_visit?:  string;
  alert_level:  'none' | 'warning' | 'critical';
}

export interface HealthAssessmentInput {
  farm_id:      number;
  crop_stage:   string;
  plant_height: number;
  canopy_pct:   number;
  pests:        Array<{ type: string; severity: number; treatment: string }>;
  diseases:     Array<{ type: string; description: string }>;
  nutrients:    string;
  submitted_at: string;
}

export interface VisitReportInput {
  farm_id:          number;
  findings_summary: string;
  recommendations:  string[];
  next_visit_date:  string;
  farmer_otp?:      string;
  submitted_at:     string;
}

export const agronomistApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFarms: build.query<Farm[], void>({
      query: () => '/agronomist/farms',
    }),
    submitAssessment: build.mutation<{ id: number }, HealthAssessmentInput>({
      query: ({ farm_id, ...body }) => ({
        url:    `/agronomist/farms/${farm_id}/assessment`,
        method: 'POST',
        body,
      }),
    }),
    submitVisitReport: build.mutation<{ id: number }, VisitReportInput>({
      query: ({ farm_id, ...body }) => ({
        url:    `/agronomist/farms/${farm_id}/visit-report`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetFarmsQuery,
  useSubmitAssessmentMutation,
  useSubmitVisitReportMutation,
} = agronomistApi;
