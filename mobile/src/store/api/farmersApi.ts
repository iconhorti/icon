import { baseApi } from './baseApi';

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
  password:      string;
}

export const farmersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFarmers: build.query<{ items: Farmer[]; total: number }, { limit?: number; search?: string }>({
      query: (params) => ({ url: '/farmers', params }),
      providesTags: ['Farmers'],
    }),
    registerFarmer: build.mutation<Farmer, RegisterFarmerInput>({
      query: (body) => ({ url: '/farmers', method: 'POST', body }),
      invalidatesTags: ['Farmers', 'Stats'],
    }),
  }),
});

export const { useGetFarmersQuery, useRegisterFarmerMutation } = farmersApi;
