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
 * Backend contract: POST /api/v1/notifications/stream-token (Bearer auth)
 *   → { stream_token } — a 60-second single-purpose token. Then
 * GET /api/v1/notifications/stream?token=<stream_token> (text/event-stream)
 *   emits an event whenever the current user gets a new/updated notification.
 *
 * The main session JWT never rides the query string (query strings end up in
 * access/proxy logs); only the short-lived stream token does, and the backend
 * rejects anything else on /stream.
 *
 * Degrades gracefully: if either endpoint isn't deployed or errors, we close
 * the connection and do NOT reconnect-loop — the existing polling query keeps
 * things working. So this is safe to ship before the backend.
 */
export function useNotificationsStream() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof EventSource === 'undefined') return; // SSR / unsupported
    const token = authToken();
    if (!token) return;

    const base = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');

    let es: EventSource | null = null;
    let cancelled = false;
    let closedByError = false;

    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
    };

    (async () => {
      let streamToken: string;
      try {
        const res = await fetch(`${base}/notifications/stream-token`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return; // endpoint missing/unauthorized — polling covers us
        streamToken = (await res.json())?.stream_token;
        if (!streamToken || cancelled) return;
      } catch {
        return;
      }

      try {
        es = new EventSource(`${base}/notifications/stream?token=${encodeURIComponent(streamToken)}`);
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
    })();

    return () => {
      cancelled = true;
      if (!closedByError) es?.close();
    };
  }, [qc]);
}
