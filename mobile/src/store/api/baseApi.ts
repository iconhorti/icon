import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

const USER_KEY = 'icon_user';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:8000/api/v1',
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
