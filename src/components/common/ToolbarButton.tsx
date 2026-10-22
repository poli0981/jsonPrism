import { cn } from '@/lib/utils';

interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  /** Shown instead of `label` (visually) without changing the accessible name. */
  visibleLabel?: string;
  className?: string;
}

/**
 * Compact icon + label button for panel headers. The `group` class lets icons
 * animate on hover (`motion-safe:group-hover:…`); the label hides on narrow
 * screens but stays the accessible name.
 */
export function ToolbarButton({
  onClick,
  label,
  icon,
  disabled,
  visibleLabel,
  className,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'group text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs transition outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {icon}
      <span className="hidden sm:inline">{visibleLabel ?? label}</span>
    </button>
  );
}
