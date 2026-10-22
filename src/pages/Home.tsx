import { useTranslation } from 'react-i18next';
import { ConverterWorkspace } from '@/components/converter/ConverterWorkspace';

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-5">
      <header className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <p className="label-mono mb-1">{t('home.kicker')}</p>
          <h1 className="text-3xl leading-none font-semibold tracking-tight md:text-4xl">
            <span className="text-spectrum">{t('home.title_accent')}</span> {t('home.title_rest')}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">{t('app.description')}</p>
        </div>
        <div className="text-muted-foreground hidden font-mono text-xs md:block">
          {t('home.drop_zone_hint')}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <ConverterWorkspace />
      </div>
    </div>
  );
}
