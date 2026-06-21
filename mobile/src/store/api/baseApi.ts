import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../constants/config';

const USER_KEY = 'icon_user';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: async (headers) => {
      try {
        const stored = await SecureStore.getItemAsync(USER_KEY);
        if (stored) {
          const user = JSON.parse(stored) as { token: string };
          headers.set('Authorization', `Bearer ${user.token}`);
        }
      } catch {
        // corrupted store — skip auth header
      }
      return headers;
    },
  }),
  tagTypes: ['Projects', 'Farmers', 'Documents', 'Notifications', 'Stats'],
  endpoints: () => ({}),
});
