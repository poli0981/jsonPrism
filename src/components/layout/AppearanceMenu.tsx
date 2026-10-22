import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Monitor, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme, type Theme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/stores/preferencesStore';

const THEMES: Array<{ value: Theme; Icon: typeof Sun }> = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Monitor },
];

/**
 * Header "Appearance" popover: theme (light / dark / system), the hide-scrollbars
 * preference and — on the web build — the anonymous-analytics opt-out.
 * Keyboard: arrow keys move between items, Escape closes and restores focus.
 */
export function AppearanceMenu() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const hideScrollbars = usePreferencesStore((s) => s.hideScrollbars);
  const setHideScrollbars = usePreferencesStore((s) => s.setHideScrollbars);
  const analytics = usePreferencesStore((s) => s.analytics);
  const setAnalytics = usePreferencesStore((s) => s.setAnalytics);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const scrollbarsId = useId();
  const analyticsId = useId();

  useEffect(() => {
    if (!open) return;
    // Focus the active theme so arrow keys start from the current choice.
    panelRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    const onPointer = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? [],
    );
    if (items.length === 0) return;
    e.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  const TriggerIcon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex h-9 w-9 items-center justify-center rounded-md transition outline-none focus-visible:ring-2"
        aria-label={t('appearance.title')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <TriggerIcon
          className="h-4 w-4 transition-transform duration-500 motion-safe:group-hover:rotate-45"
          aria-hidden
        />
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="group"
          aria-label={t('appearance.title')}
          onKeyDown={onPanelKeyDown}
          className="border-border bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 absolute top-full right-0 z-50 mt-1 w-64 rounded-lg border p-1.5 shadow-lg"
        >
          <p className="label-mono px-2 pt-1 pb-1.5">{t('appearance.theme')}</p>
          <div role="radiogroup" aria-label={t('appearance.theme')}>
            {THEMES.map(({ value, Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-menu-item
                  onClick={() => setTheme(value)}
                  className={cn(
                    'hover:bg-muted focus-visible:bg-muted flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none',
                    active && 'text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="flex-1">{t(`theme.${value}`)}</span>
                  {active && <Check className="motion-safe:animate-pop h-4 w-4" aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="border-border/70 my-1.5 border-t" />
          <p className="label-mono flex items-center gap-1.5 px-2 pt-1 pb-1.5">
            <SlidersHorizontal className="h-3 w-3" aria-hidden />
            {t('appearance.display')}
          </p>
          <label
            htmlFor={scrollbarsId}
            className="hover:bg-muted flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-sm"
          >
            <span>{t('appearance.hide_scrollbars')}</span>
            <Switch
              id={scrollbarsId}
              data-menu-item
              checked={hideScrollbars}
              onCheckedChange={setHideScrollbars}
            />
          </label>
          {!__IS_TAURI_BUILD__ && (
            <label
              htmlFor={analyticsId}
              className="hover:bg-muted flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-sm"
            >
              <span className="flex flex-col">
                <span id={`${analyticsId}-label`}>{t('appearance.analytics')}</span>
                <span id={`${analyticsId}-hint`} className="text-muted-foreground text-xs">
                  {t('appearance.analytics_hint')}
                </span>
              </span>
              <Switch
                id={analyticsId}
                aria-labelledby={`${analyticsId}-label`}
                aria-describedby={`${analyticsId}-hint`}
                data-menu-item
                checked={analytics}
                onCheckedChange={setAnalytics}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
