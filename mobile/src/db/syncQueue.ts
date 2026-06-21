import * as SQLite from 'expo-sqlite';
import * as Network from 'expo-network';

export type QueueItemType = 'site_visit' | 'dpr' | 'health_assessment' | 'visit_report';

export interface QueueItem {
  id:         number;
  type:       QueueItemType;
  payload:    string;
  endpoint:   string;
  method:     string;
  created_at: number;
  attempts:   number;
  uuid:       string;
}

export interface SyncResult {
  synced:  number;
  failed:  number;  // transient failures, still queued for retry
  dropped: number;  // poison messages discarded (max attempts or non-retryable)
}

const QUEUE_DB = 'icon_queue.db';

// Give up on an item after this many transient failures (poison-message guard).
const MAX_ATTEMPTS = 5;

let _db: SQLite.SQLiteDatabase | null = null;

// Lightweight idempotency key so a retry after a lost response doesn't double-submit.
function makeUuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Retry only on transient conditions; 4xx (validation/auth/conflict) won't fix
// itself, so those are dead-lettered rather than retried forever.
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(QUEUE_DB);
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL,
      payload    TEXT NOT NULL,
      endpoint   TEXT NOT NULL,
      method     TEXT NOT NULL DEFAULT 'POST',
      created_at INTEGER NOT NULL,
      attempts   INTEGER NOT NULL DEFAULT 0,
      uuid       TEXT
    );
  `);
  // Migrate older installs that predate the uuid column (throws if it exists → ignore).
  try { await _db.execAsync('ALTER TABLE sync_queue ADD COLUMN uuid TEXT'); } catch { /* already present */ }
  return _db;
}

export async function queueAdd(type: QueueItemType, endpoint: string, payload: object, method = 'POST'): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO sync_queue (type, payload, endpoint, method, created_at, uuid) VALUES (?, ?, ?, ?, ?, ?)',
      [type, JSON.stringify(payload), endpoint, method, Date.now(), makeUuid()]
    );
  } catch { /* non-critical */ }
}

export async function queueGetAll(): Promise<QueueItem[]> {
  const db = await getDb();
  return db.getAllAsync<QueueItem>('SELECT * FROM sync_queue ORDER BY created_at ASC');
}

export async function queueRemove(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export async function queueIncrementAttempts(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?', [id]);
}

export async function queueCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM sync_queue');
  return row?.n ?? 0;
}

/** Wipe all pending writes — call on logout so they never replay under another user. */
export async function queueClear(): Promise<void> {
  try {
    const db = await getDb();
    await db.execAsync('DELETE FROM sync_queue');
  } catch { /* ignore */ }
}

/**
 * Flush queued writes to the server. Safe to call repeatedly:
 *  • success            → removed
 *  • non-retryable 4xx  → dropped (dead-lettered; retrying can't help)
 *  • transient 5xx/net  → attempt counted, retried later, dropped after MAX_ATTEMPTS
 * Sends an Idempotency-Key header so a retry after a lost response is a no-op
 * server-side (backend should honour it; harmless if it doesn't).
 */
export async function syncNow(authToken: string, apiUrl: string): Promise<SyncResult> {
  const state = await Network.getNetworkStateAsync();
  if (!state.isConnected) return { synced: 0, failed: 0, dropped: 0 };

  const items = await queueGetAll();
  let synced = 0, failed = 0, dropped = 0;

  for (const item of items) {
    // Poison-message guard: give up before sending if we've already tried too many times.
    if (item.attempts >= MAX_ATTEMPTS) {
      await queueRemove(item.id);
      dropped++;
      continue;
    }
    try {
      const res = await fetch(`${apiUrl}${item.endpoint}`, {
        method:  item.method,
        headers: {
          'Content-Type':   'application/json',
          'Authorization':  `Bearer ${authToken}`,
          'Idempotency-Key': item.uuid ?? String(item.id),
        },
        body: item.payload,
      });
      if (res.ok) {
        await queueRemove(item.id);
        synced++;
      } else if (!isRetryableStatus(res.status)) {
        // Validation/auth/conflict — won't succeed on retry. Dead-letter it.
        await queueRemove(item.id);
        dropped++;
      } else {
        await queueIncrementAttempts(item.id);
        failed++;
      }
    } catch {
      // Network blip — keep for retry.
      await queueIncrementAttempts(item.id);
      failed++;
    }
  }
  return { synced, failed, dropped };
}
