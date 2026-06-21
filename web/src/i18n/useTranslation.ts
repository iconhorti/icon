import { useSyncExternalStore, useCallback } from 'react';
import { t as translate, getLang, setLang, type Lang } from './index';

function subscribe(cb: () => void) {
  window.addEventListener('icon-lang-change', cb);
  return () => window.removeEventListener('icon-lang-change', cb);
}

/**
 * Components call `const { t, lang, setLang } = useTranslation()`. Using
 * useSyncExternalStore means every consumer re-renders when the language flips,
 * without a Context provider.
 */
export function useTranslation() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang) as Lang;
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, vars),
    // re-bind when lang changes so memoized children update
    [lang], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return { t, lang, setLang };
}
