// ════════════════════════════════════════════════════════════════════════════
// Optimistic-concurrency (lost-update) helpers — mobile parity with the web
// app's web/src/lib/concurrency.ts.
//
// The client sends the version it loaded; the backend rejects a stale write with
// 409. Until the backend enforces it, the token is sent but ignored and no 409
// fires, so this is purely additive.
// ════════════════════════════════════════════════════════════════════════════

export const CONFLICT_MESSAGE =
  'This record was changed by someone else since you opened it. Reload to see the latest version before saving again.';

/** Pull the concurrency token from a loaded entity (version preferred, else updated_at). */
export function versionOf(entity: any): { version?: number; updated_at?: string } {
  if (!entity) return {};
  if (entity.version !== undefined && entity.version !== null) return { version: entity.version };
  if (entity.updated_at) return { updated_at: entity.updated_at };
  return {};
}

/**
 * True when an error is an HTTP 409 Conflict. Handles both raw errors and the
 * RTK Query error shape ({ status, data }).
 */
export function isConflict(err: unknown): boolean {
  const e = err as { status?: number; response?: { status?: number } };
  return e?.status === 409 || e?.response?.status === 409;
}
