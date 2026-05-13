import { useTranslation } from 'react-i18next';

export function About() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-spectrum mb-4 text-5xl italic tracking-tight">
        {t('about.title')}
      </h1>
      <p className="font-display text-foreground/90 mb-8 text-2xl italic">{t('about.lead')}</p>
      <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
      </div>
      <div className="border-border/60 text-muted-foreground mt-12 border-t pt-6 font-mono text-xs">
        {t('about.version', { version: __APP_VERSION__ })}
      </div>
    </div>
  );
}
