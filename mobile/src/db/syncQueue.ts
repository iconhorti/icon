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
}

const QUEUE_DB = 'icon_queue.db';
let _db: SQLite.SQLiteDatabase | null = null;

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
      attempts   INTEGER NOT NULL DEFAULT 0
    );
  `);
  return _db;
}

export async function queueAdd(type: QueueItemType, endpoint: string, payload: object, method = 'POST'): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO sync_queue (type, payload, endpoint, method, created_at) VALUES (?, ?, ?, ?, ?)',
      [type, JSON.stringify(payload), endpoint, method, Date.now()]
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

export async function syncNow(authToken: string, apiUrl: string): Promise<{ synced: number; failed: number }> {
  const state = await Network.getNetworkStateAsync();
  if (!state.isConnected) return { synced: 0, failed: 0 };
  const items = await queueGetAll();
  let synced = 0, failed = 0;
  for (const item of items) {
    try {
      await queueIncrementAttempts(item.id);
      const res = await fetch(`${apiUrl}${item.endpoint}`, {
        method:  item.method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body:    item.payload,
      });
      if (res.ok) { await queueRemove(item.id); synced++; } else { failed++; }
    } catch { failed++; }
  }
  return { synced, failed };
}
