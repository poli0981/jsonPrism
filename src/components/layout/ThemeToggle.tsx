import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-md transition"
        aria-label="Theme"
      >
        <Icon className="h-4 w-4" />
      </button>
      {open && (
        <div className="border-border bg-popover absolute right-0 top-full z-50 mt-1 w-32 rounded-md border p-1 shadow-lg">
          {(['light', 'dark', 'system'] as Theme[]).map((t2) => (
            <button
              key={t2}
              type="button"
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
