import { baseApi } from './baseApi';

export interface AppNotification {
  id:                number;
  title:             string;
  body:              string;
  is_read:           boolean;
  notification_type: string;
  created_at:        string;
  project_id?:       number;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<AppNotification[], void>({
      query: () => '/notifications',
      providesTags: ['Notifications'],
    }),
    markRead: build.mutation<void, number>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkReadMutation } = notificationsApi;
