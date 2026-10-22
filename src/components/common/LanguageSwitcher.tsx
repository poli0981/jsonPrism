import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'vi', label: 'VI', name: 'Tiếng Việt' },
  { code: 'ja', label: 'JA', name: '日本語' },
  { code: 'zh-CN', label: 'ZH', name: '简体中文' },
] as const;

/** Button group on ≥ sm screens; a compact native select on phones (fits 360px headers). */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? 'en';
  const change = (code: string) => void i18n.changeLanguage(code);

  return (
    <>
      <div
        className="border-border/70 hidden items-center gap-0.5 rounded-md border p-0.5 sm:flex"
        role="group"
        aria-label={t('language.label')}
      >
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            lang={lang.code}
            aria-pressed={current === lang.code}
            aria-label={lang.name}
            title={lang.name}
            onClick={() => change(lang.code)}
            className={cn(
              'focus-visible:ring-ring min-h-7 min-w-8 rounded px-1.5 font-mono text-xs font-medium transition outline-none focus-visible:ring-2',
              current === lang.code
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {lang.label}
          </button>
        ))}
      </div>
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        aria-label={t('language.label')}
        className="border-border/70 text-foreground h-9 rounded-md border bg-transparent px-1.5 font-mono text-xs sm:hidden"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} lang={lang.code}>
            {lang.label} · {lang.name}
          </option>
        ))}
      </select>
    </>
  );
}
