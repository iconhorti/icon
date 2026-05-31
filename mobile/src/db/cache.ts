import * as SQLite from 'expo-sqlite';

const DB_NAME = 'icon_cache.db';

// TTLs in milliseconds
export const TTL = {
  stats:         15 * 60 * 1000,  // 15 minutes
  projects:      60 * 60 * 1000,  // 1 hour
  notifications:  5 * 60 * 1000,  // 5 minutes
  documents:     10 * 60 * 1000,  // 10 minutes
  farmers:       60 * 60 * 1000,  // 1 hour
} as const;

export type CacheKey = keyof typeof TTL;

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS cache (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      cached_at  INTEGER NOT NULL
    );
  `);
  return _db;
}

/**
 * Store a JSON-serialisable value in the cache.
 */
export async function cacheSet(key: CacheKey, value: unknown): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO cache (key, value, cached_at) VALUES (?, ?, ?)',
      [key, JSON.stringify(value), Date.now()]
    );
  } catch {
    // Non-critical — silently ignore write errors
  }
}

/**
 * Read a cached value. Returns null if missing or expired.
 */
export async function cacheGet<T>(key: CacheKey): Promise<{ data: T; cachedAt: number } | null> {
  try {
    const db  = await getDb();
    const row = await db.getFirstAsync<{ value: string; cached_at: number }>(
      'SELECT value, cached_at FROM cache WHERE key = ?',
      [key]
    );
    if (!row) return null;

    const ttl     = TTL[key];
    const age     = Date.now() - row.cached_at;
    if (age > ttl) return null;   // expired

    return { data: JSON.parse(row.value) as T, cachedAt: row.cached_at };
  } catch {
    return null;
  }
}

/**
 * Read a cached value regardless of TTL (stale-but-valid fallback).
 */
export async function cacheGetStale<T>(key: CacheKey): Promise<{ data: T; cachedAt: number } | null> {
  try {
    const db  = await getDb();
    const row = await db.getFirstAsync<{ value: string; cached_at: number }>(
      'SELECT value, cached_at FROM cache WHERE key = ?',
      [key]
    );
    if (!row) return null;
    return { data: JSON.parse(row.value) as T, cachedAt: row.cached_at };
  } catch {
    return null;
  }
}

/**
 * Clear all cached data (e.g., on logout).
 */
export async function cacheClear(): Promise<void> {
  try {
    const db = await getDb();
    await db.execAsync('DELETE FROM cache');
  } catch {
    // ignore
  }
}

/**
 * Format "last updated X ago" label.
 */
export function formatCacheAge(cachedAt: number): string {
  const seconds = Math.floor((Date.now() - cachedAt) / 1000);
  if (seconds < 60)   return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
