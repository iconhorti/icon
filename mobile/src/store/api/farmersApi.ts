import { baseApi } from './baseApi';
import { mapBackendFarmer, wrapListResponse } from './transforms';

export interface Farmer {
  id:            number;
  first_name:    string;
  last_name?:    string;
  phone_primary: string;
  village_id?:   number;
  is_active:     boolean;
  created_at:    string;
}

export interface RegisterFarmerInput {
  first_name:    string;
  last_name?:    string;
  phone_primary: string;
  password?:     string;
}

export const farmersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFarmers: build.query<{ items: Farmer[]; total: number }, { limit?: number; search?: string }>({
      query: (params) => ({ url: '/farmers', params }),
      transformResponse: (response: Parameters<typeof mapBackendFarmer>[0][]) =>
        wrapListResponse(response.map(mapBackendFarmer)),
      providesTags: ['Farmers'],
    }),
    registerFarmer: build.mutation<Farmer, RegisterFarmerInput>({
      query: ({ first_name, last_name, phone_primary }) => ({
        url:  '/users',
        method: 'POST',
        body: {
          first_name,
          last_name,
          phone_primary,
          role: 'farmer',
        },
      }),
      transformResponse: mapBackendFarmer,
      invalidatesTags: ['Farmers', 'Stats'],
    }),
  }),
});

export const { useGetFarmersQuery, useRegisterFarmerMutation } = farmersApi;
