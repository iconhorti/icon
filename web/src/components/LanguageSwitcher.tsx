import { useTranslation } from '../i18n/useTranslation';
import { LANGUAGES, type Lang } from '../i18n';

/** Small dropdown to flip the UI language. Drop into the Sidebar or top bar. */
export default function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      aria-label="Language"
      style={{
        fontSize: '0.8rem', padding: '0.25rem 0.5rem',
        borderRadius: 6, border: '1px solid var(--glass-border, #e2e8f0)',
        background: 'var(--glass-bg, #fff)', color: 'var(--color-text-main, #1e293b)',
        cursor: 'pointer',
      }}
    >
      {Object.entries(LANGUAGES).map(([code, label]) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
