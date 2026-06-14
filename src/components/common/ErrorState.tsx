import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  /** HTTP-style code or short token (404, 403, "offline") shown large above the title. */
  code?: string | number;
  title: string;
  message?: string;
  icon?: ReactNode;
  /** Buttons / links — use `errorActionPrimary` / `errorActionSecondary` for styling. */
  actions?: ReactNode;
  className?: string;
}

export const errorActionPrimary =
  'bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90';
export const errorActionSecondary =
  'border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition';

/**
 * Shared presentational error panel. Stays i18n-free — callers pass already
 * translated strings — so it renders even if a crash is inside i18n itself.
 */
export function ErrorState({ code, title, message, icon, actions, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        'bg-background text-foreground flex min-h-0 flex-1 items-center justify-center p-8',
        className,
      )}
    >
      <div className="border-border bg-card flex w-full max-w-md flex-col items-center gap-4 rounded-lg border p-8 text-center">
        {code !== undefined && (
          <span className="font-display text-spectrum text-6xl leading-none italic">{code}</span>
        )}
        {icon}
        <h1 className="font-display text-2xl">{title}</h1>
        {message && <p className="text-muted-foreground text-sm">{message}</p>}
        {actions && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
