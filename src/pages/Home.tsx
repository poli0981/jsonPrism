import { useTranslation } from 'react-i18next';
import { ConverterWorkspace } from '@/components/converter/ConverterWorkspace';

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <h1 className="font-display text-4xl leading-none tracking-tight md:text-5xl">
            <span className="text-spectrum italic">Disperse</span> JSON.
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">{t('app.description')}</p>
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
