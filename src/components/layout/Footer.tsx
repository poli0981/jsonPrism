export function Footer() {
  return (
    <footer className="border-border/60 text-muted-foreground border-t px-6 py-6 text-xs">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-2 sm:flex-row">
        <div>
          <span className="font-mono">JSONPrism</span> · v{__APP_VERSION__} · Apache-2.0
        </div>
        <div className="flex items-center gap-1.5">
          <span>Built by</span>
          <a
            href="https://github.com/poli0981"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            poli0981
          </a>
        </div>
      </div>
    </footer>
  );
}
