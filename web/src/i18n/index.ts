// ════════════════════════════════════════════════════════════════════════════
// Lightweight i18n scaffold — zero-dependency. This is the *foundation*: it wires
// language selection + a typed `t()` so strings can be migrated into dictionaries
// incrementally. It deliberately does NOT translate the whole app yet — each page
// can be moved over key-by-key. To add a real library later (react-i18next),
// swap the `t` implementation; call sites stay the same.
// ════════════════════════════════════════════════════════════════════════════

import en from './en';
import hi from './hi';

export const LANGUAGES = {
  en: 'English',
  hi: 'हिन्दी',
} as const;

export type Lang = keyof typeof LANGUAGES;

export type Dict = Record<string, string>;

const DICTS: Record<Lang, Dict> = { en, hi };

const STORAGE_KEY = 'icon_lang';

export function getLang(): Lang {
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Lang | null;
  return saved && saved in LANGUAGES ? saved : 'en';
}

export function setLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent('icon-lang-change', { detail: lang }));
}

/**
 * Translate `key`. Falls back: current lang → English → the key itself (so an
 * un-migrated string renders readably instead of blank). Supports {placeholders}.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = getLang();
  const raw = DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
