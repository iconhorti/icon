import { useSyncQueue } from '../hooks/useSyncQueue';

/**
 * Headless component that drives the offline write queue. Mounting it once (in
 * App, inside AuthProvider) is what actually flushes queued submissions —
 * without it, screens that call queueAdd() persist to SQLite but nothing ever
 * sends them to the server.
 */
export default function SyncQueueRunner() {
  useSyncQueue(); // syncs on app-foreground and on network-regained
  return null;
}
