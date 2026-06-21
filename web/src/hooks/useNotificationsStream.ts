import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Broadcast so non-query consumers (e.g. the Sidebar unread badge) can refresh too.
export const NOTIFICATIONS_REFRESH_EVENT = 'icon-notifications-refresh';

function authToken(): string | null {
  try {
    const u = localStorage.getItem('icon_user');
    return u ? (JSON.parse(u)?.token ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to server-sent notification events and refreshes notification data
 * on push — replacing the 60-second poll with near-instant updates.
 *
 * Backend contract (proposed): GET /api/v1/notifications/stream  (text/event-stream)
 *   emits an event whenever the current user gets a new/updated notification.
 *
 * Degrades gracefully: if the endpoint isn't deployed, EventSource errors, we
 * close the connection and do NOT reconnect-loop — the existing polling query
 * keeps things working. So this is safe to ship before the backend.
 */
export function useNotificationsStream() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof EventSource === 'undefined') return; // SSR / unsupported
    const token = authToken();
    if (!token) return;

    const base = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');
    // Token in query string because EventSource can't set Authorization headers.
    const url = `${base}/notifications/stream?token=${encodeURIComponent(token)}`;

    let es: EventSource | null = null;
    let closedByError = false;

    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
    };

    try {
      es = new EventSource(url);
      es.onmessage = refresh;
      es.addEventListener('notification', refresh);
      es.onerror = () => {
        // Endpoint missing or connection dropped — stop here; polling covers us.
        closedByError = true;
        es?.close();
      };
    } catch {
      closedByError = true;
    }

    return () => { if (!closedByError) es?.close(); };
  }, [qc]);
}
