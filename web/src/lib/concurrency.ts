// ════════════════════════════════════════════════════════════════════════════
// concurrency.ts — optimistic-concurrency (lost-update) helpers.
//
// Problem: two users editing the same record; the second save silently clobbers
// the first. Fix: the client sends the version it loaded; the backend rejects a
// stale write with HTTP 409. This module is the frontend half — it extracts the
// version to send and detects the conflict response.
//
// Backend contract (proposed):
//   • Each mutable entity exposes a concurrency token: `version` (int, preferred)
//     or `updated_at` (ISO string) as a fallback.
//   • On update, the client includes that token in the payload.
//   • If the stored token differs, the API responds 409 Conflict.
// Until the backend enforces this, nothing breaks: the token is sent but ignored,
// and no 409 ever fires.
// ════════════════════════════════════════════════════════════════════════════

export const CONFLICT_MESSAGE =
  'This record was changed by someone else since you opened it. Reload to see the latest version before saving again.';

/** True when an error is an HTTP 409 Conflict (stale write). */
export function isConflict(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 409;
}

/**
 * Pull the concurrency token from a loaded entity. Returns an object you can
 * spread into an update payload — `{}` when the entity exposes neither field, so
 * it's a no-op against a backend that doesn't support it yet.
 */
export function versionOf(entity: any): { version?: number; updated_at?: string } {
  if (!entity) return {};
  if (entity.version !== undefined && entity.version !== null) return { version: entity.version };
  if (entity.updated_at) return { updated_at: entity.updated_at };
  return {};
}
