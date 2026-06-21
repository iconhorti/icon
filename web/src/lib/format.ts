// ════════════════════════════════════════════════════════════════════════════
// format.ts — shared display formatters. Replaces the per-page `fmt`/`fmtNum`/
// `fmtCrore` copies and the mixed-type `conversionRate` bugs (these always
// return a string, never `string | number`).
// ════════════════════════════════════════════════════════════════════════════

type Num = number | null | undefined;

const n = (v: Num): number => (v == null || isNaN(Number(v)) ? 0 : Number(v));

/** Plain integer with Indian digit grouping: 1234567 → "12,34,567". */
export const fmtNumber = (v: Num): string => n(v).toLocaleString('en-IN');

/** Rupee amount, no decimals: 1234567 → "₹12,34,567". */
export const fmtCurrency = (v: Num): string => `₹${Math.round(n(v)).toLocaleString('en-IN')}`;

/** Compact rupee amount with Cr / L suffixes for dashboards. */
export const fmtCrore = (v: Num): string => {
  const x = n(v);
  if (x >= 1_00_00_000) return `₹${(x / 1_00_00_000).toFixed(2)} Cr`;
  if (x >= 1_00_000) return `₹${(x / 1_00_000).toFixed(2)} L`;
  return fmtCurrency(x);
};

/**
 * Percentage as a string with fixed decimals. Always a string (was the source of
 * the `string | number` union in conversionRate). 0/0 → "0.0".
 */
export const pct = (numerator: Num, denominator: Num, decimals = 1): string => {
  const d = n(denominator);
  if (d === 0) return (0).toFixed(decimals);
  return ((n(numerator) / d) * 100).toFixed(decimals);
};

/** ISO date → "08 Jun 2026". Empty/invalid → "—". */
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
