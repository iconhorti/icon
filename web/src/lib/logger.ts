// ════════════════════════════════════════════════════════════════════════════
// logger.ts — central place for swallowed errors. Replaces `catch { /* ignore */ }`
// so failures are at least visible in dev and can be wired to Sentry/LogRocket in
// one spot later (replace the body of `report`).
// ════════════════════════════════════════════════════════════════════════════

const isDev = import.meta.env.DEV;

function report(level: 'warn' | 'error', scope: string, err: unknown, extra?: unknown) {
  // Single integration point — swap for Sentry.captureException etc.
  const prefix = `[ICON:${scope}]`;
  if (isDev) {
    // eslint-disable-next-line no-console
    (level === 'error' ? console.error : console.warn)(prefix, err, extra ?? '');
  }
  // In production we still surface real errors to the console so support can
  // ask users to copy them; non-fatal warnings stay quiet.
  else if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(prefix, err);
  }
}

export const logger = {
  /** Non-fatal — operation failed but the app can continue. */
  warn: (scope: string, err: unknown, extra?: unknown) => report('warn', scope, err, extra),
  /** Fatal-ish — something the user likely needs to know about. */
  error: (scope: string, err: unknown, extra?: unknown) => report('error', scope, err, extra),
};

/** Extract a human-readable message from an axios/Error/unknown rejection. */
export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const e = err as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = e?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d?.msg).filter(Boolean).join(', ') || fallback;
  }
  if (typeof detail === 'string') return detail;
  return e?.message || fallback;
}
