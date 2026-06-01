import { useEffect, useCallback, useState } from 'react';
import { AppState }              from 'react-native';
import { syncNow, queueCount }   from '../db/syncQueue';
import { useAuthContext }         from '../context/AuthContext';

export function useSyncQueue(): { pendingCount: number } {
  const { user }               = useAuthContext();
  const [pendingCount, setPendingCount] = useState(0);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:8000/api/v1';

  const updateCount = useCallback(async () => {
    setPendingCount(await queueCount());
  }, []);

  const attemptSync = useCallback(async () => {
    if (!user?.token) return;
    await syncNow(user.token, apiUrl);
    await updateCount();
  }, [user?.token, apiUrl, updateCount]);

  useEffect(() => {
    updateCount();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') attemptSync();
    });
    return () => sub.remove();
  }, [attemptSync, updateCount]);

  return { pendingCount };
}
