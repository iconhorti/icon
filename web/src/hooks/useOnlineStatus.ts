import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

/**
 * Reactive browser connectivity. First slice of offline resilience — surfaces a
 * banner and lets mutation buttons disable themselves when there's no network.
 * (Full offline-draft queue is a separate milestone; see IMPROVEMENTS.md.)
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // assume online during SSR/first paint
  );
}
