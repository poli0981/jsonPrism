import { useTranslation } from 'react-i18next';
import { ConverterWorkspace } from '@/components/converter/ConverterWorkspace';

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem-4rem)] max-w-screen-2xl flex-col gap-6 px-6 py-6">
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl leading-none tracking-tight md:text-5xl">
            <span className="text-spectrum italic">Disperse</span> JSON.
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            {t('app.description')}
          </p>
        </div>
        <div className="text-muted-foreground/60 hidden font-mono text-xs md:block">
          {t('home.drop_zone_hint')}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <ConverterWorkspace />
      </div>
    </div>
  );
}
