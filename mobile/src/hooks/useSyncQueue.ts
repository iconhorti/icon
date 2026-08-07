import { useEffect, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { syncNow, queueCount } from '../db/syncQueue';
import { useAuthContext } from '../context/AuthContext';
import { API_URL } from '../constants/config';
import { store } from '../store';
import { baseApi } from '../store/api/baseApi';

export function useSyncQueue(): { pendingCount: number; syncNow: () => Promise<void> } {
  const { user } = useAuthContext();
  const [pendingCount, setPendingCount] = useState(0);

  const updateCount = useCallback(async () => {
    setPendingCount(await queueCount());
  }, []);

  const attemptSync = useCallback(async () => {
    if (!user?.token) return;
    const result = await syncNow(user.token, API_URL);
    // The queue writes via raw fetch() (by design — it predates/bypasses RTK
    // Query), so a successful background sync never invalidates the RTK cache
    // on its own. Without this, screens with cached Projects/Farmers/Stats
    // data stay stale even though the write succeeded moments earlier.
    if (result.synced > 0) {
      store.dispatch(baseApi.util.invalidateTags(['Projects', 'Farmers', 'Stats']));
    }
    await updateCount();
  }, [user?.token, updateCount]);

  useEffect(() => {
    updateCount();

    // 1) Sync when the app returns to the foreground.
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') attemptSync();
    });

    // 2) Sync the moment connectivity is regained mid-session (field workers
    //    often get signal back without ever backgrounding the app). Guarded
    //    because the listener API isn't present on every expo-network version.
    let netSub: { remove: () => void } | undefined;
    const addNetListener = (Network as any).addNetworkStateListener;
    if (typeof addNetListener === 'function') {
      netSub = addNetListener((state: any) => {
        if (state?.isConnected) attemptSync();
      });
    }

    return () => {
      appSub.remove();
      netSub?.remove();
    };
  }, [attemptSync, updateCount]);

  return { pendingCount, syncNow: attemptSync };
}
