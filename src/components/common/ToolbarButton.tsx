interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export function ToolbarButton({ onClick, label, icon, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
