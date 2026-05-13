import { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside the dropdown container. pointerdown fires before
  // click, so we close before any focus-related races can drop the click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-md transition"
        aria-label="Theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="border-border bg-popover absolute top-full right-0 z-50 mt-1 w-32 rounded-md border p-1 shadow-lg"
        >
          {(['light', 'dark', 'system'] as Theme[]).map((t2) => (
            <button
              key={t2}
              type="button"
              role="menuitemradio"
              aria-checked={theme === t2}
              onClick={() => {
                setTheme(t2);
                setOpen(false);
              }}
              className={cn(
                'hover:bg-muted flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                theme === t2 && 'text-primary',
              )}
            >
              {t2 === 'light' && <Sun className="h-3.5 w-3.5" />}
              {t2 === 'dark' && <Moon className="h-3.5 w-3.5" />}
              {t2 === 'system' && <Monitor className="h-3.5 w-3.5" />}
              {t(`theme.${t2}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
