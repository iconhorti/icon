import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../api/client';
import { qk } from '../lib/queryClient';
import type { Notification } from '../types/models';

export function useNotifications(params: Record<string, any> = {}) {
  return useQuery<Notification[]>({
    queryKey: qk.notifications(params),
    queryFn: async () => {
      const data = await getMyNotifications(params);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
