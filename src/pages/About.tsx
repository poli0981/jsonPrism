import { useTranslation } from 'react-i18next';
import { ExternalLink, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const REPO_URL = 'https://github.com/poli0981/jsonPrism';

interface DonatePlatform {
  key: 'github' | 'ko_fi' | 'buy_me_a_coffee' | 'patreon' | 'paypal';
  url: string;
}

// Driven by .github/FUNDING.yml — keep in sync with that file.
const DONATE: DonatePlatform[] = [
  { key: 'github', url: 'https://github.com/sponsors/poli0981' },
  { key: 'ko_fi', url: 'https://ko-fi.com/skullmute' },
  { key: 'buy_me_a_coffee', url: 'https://www.buymeacoffee.com/skullmute' },
  { key: 'patreon', url: 'https://patreon.com/skullmute' },
  { key: 'paypal', url: 'https://paypal.me/DungDang212' },
];

interface DepCategory {
  key: 'ui' | 'editor' | 'parsers' | 'build' | 'tauri' | 'i18n';
  deps: { name: string; url: string }[];
}

const DEPS: DepCategory[] = [
  {
    key: 'ui',
    deps: [
      { name: 'React 19', url: 'https://react.dev/' },
      { name: 'Tailwind CSS v4', url: 'https://tailwindcss.com/' },
      { name: 'shadcn/ui', url: 'https://ui.shadcn.com/' },
      { name: 'Radix UI', url: 'https://www.radix-ui.com/' },
      { name: 'lucide-react', url: 'https://lucide.dev/' },
      { name: 'sonner', url: 'https://sonner.emilkowal.ski/' },
    ],
  },
  {
    key: 'editor',
    deps: [
      { name: 'CodeMirror 6', url: 'https://codemirror.net/' },
      { name: '@uiw/react-codemirror', url: 'https://uiwjs.github.io/react-codemirror/' },
    ],
  },
  {
    key: 'parsers',
    deps: [
      { name: 'PapaParse', url: 'https://www.papaparse.com/' },
      { name: 'js-yaml', url: 'https://github.com/nodeca/js-yaml' },
      { name: 'smol-toml', url: 'https://github.com/squirrelchat/smol-toml' },
      { name: 'fast-xml-parser', url: 'https://github.com/NaturalIntelligence/fast-xml-parser' },
      { name: 'bson', url: 'https://github.com/mongodb/js-bson' },
      { name: 'cbor-x', url: 'https://github.com/kriszyp/cbor-x' },
      { name: '@msgpack/msgpack', url: 'https://msgpack.org/' },
      { name: 'fflate', url: 'https://github.com/101arrowz/fflate' },
    ],
  },
  {
    key: 'build',
    deps: [
      { name: 'Vite 8', url: 'https://vite.dev/' },
      { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
      { name: 'Vitest', url: 'https://vitest.dev/' },
      { name: 'ESLint', url: 'https://eslint.org/' },
      { name: 'Prettier', url: 'https://prettier.io/' },
    ],
  },
  {
    key: 'tauri',
    deps: [
      { name: 'Tauri 2', url: 'https://tauri.app/' },
      { name: '@tauri-apps/plugin-dialog', url: 'https://tauri.app/' },
      { name: '@tauri-apps/plugin-fs', url: 'https://tauri.app/' },
      {
        name: 'tauri-plugin-single-instance',
        url: 'https://crates.io/crates/tauri-plugin-single-instance',
      },
    ],
  },
  {
    key: 'i18n',
    deps: [
      { name: 'i18next', url: 'https://www.i18next.com/' },
      { name: 'react-i18next', url: 'https://react.i18next.com/' },
    ],
  },
];

export function About() {
  const { t } = useTranslation();

  return (
    // Layout's <main> is `flex flex-1 min-h-0 flex-col` (height-bounded). The
    // About page has many sections, so it needs its own scroll container —
    // otherwise content overflows past the Footer at the bottom.
    <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-spectrum mb-4 text-5xl tracking-tight italic">
          {t('about.title')}
        </h1>
        <p className="font-display text-foreground/90 mb-8 text-2xl italic">{t('about.lead')}</p>
        <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
        </div>

        {/* Donate */}
        <section className="mt-14">
          <h2 className="font-display mb-1 text-2xl tracking-tight">
            <Heart className="mr-2 inline-block h-5 w-5 text-rose-400" />
            {t('about.donate.title')}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('about.donate.lead')}</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DONATE.map((platform) => (
              <li key={platform.key}>
                <a
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/80 inline-flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition',
                  )}
                >
                  <span className="text-foreground font-medium">
                    {t(`about.donate.${platform.key}`)}
                  </span>
                  <ExternalLink className="text-muted-foreground h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Third-party */}
        <section className="mt-14">
          <h2 className="font-display mb-1 text-2xl tracking-tight">
            {t('about.third_party.title')}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('about.third_party.lead')}</p>
          <div className="space-y-4">
            {DEPS.map((cat) => (
              <div key={cat.key}>
                <h3 className="text-foreground/80 mb-1 text-xs font-medium tracking-wider uppercase">
                  {t(`about.third_party.${cat.key}`)}
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {cat.deps.map((dep) => (
                    <li key={dep.name}>
                      <a
                        href={dep.url}
                        target="_blank"
                        rel="noreferrer"
                        className="border-border/60 bg-card/40 hover:border-primary/40 hover:text-foreground text-muted-foreground inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-xs transition"
                      >
                        {dep.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm">
            <a
              href={`${REPO_URL}/blob/main/THIRD-PARTY.md`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {t('about.third_party.see_full_list')}
            </a>
          </p>
        </section>

        {/* Build info */}
        <section className="mt-14">
          <h2 className="font-display mb-3 text-2xl tracking-tight">{t('about.build.title')}</h2>
          <dl className="border-border/60 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 border-t pt-4 font-mono text-sm">
            <dt className="text-muted-foreground">{t('about.build.version')}</dt>
            <dd className="text-foreground">{__APP_VERSION__}</dd>
            <dt className="text-muted-foreground">{t('about.build.commit')}</dt>
            <dd className="text-foreground">
              <a
                href={`${REPO_URL}/commit/${__APP_COMMIT__}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {__APP_COMMIT__}
              </a>
            </dd>
            <dt className="text-muted-foreground">{t('about.build.date')}</dt>
            <dd className="text-foreground">{__APP_BUILD_DATE__}</dd>
          </dl>
        </section>

        {/* Links */}
        <section className="mt-14">
          <h2 className="font-display mb-3 text-2xl tracking-tight">{t('about.links.title')}</h2>
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            <LinkRow href={REPO_URL} label={t('about.links.repo')} />
            <LinkRow href={`${REPO_URL}/issues`} label={t('about.links.issues')} />
            <LinkRow href={`${REPO_URL}/discussions`} label={t('about.links.discussions')} />
            <LinkRow href="https://poli0981.github.io/jsonPrism/" label={t('about.links.demo')} />
            <LinkRow href={`${REPO_URL}/blob/main/LICENSE`} label={t('about.links.license')} />
          </ul>
        </section>

        {/* Disclaimer */}
        <section className="mt-14">
          <h2 className="font-display mb-2 text-xl tracking-tight">
            {t('about.disclaimer.title')}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('about.disclaimer.body')}
          </p>
        </section>

        <div className="border-border/60 text-muted-foreground mt-12 border-t pt-6 font-mono text-xs">
          {t('about.version', { version: __APP_VERSION__ })}
        </div>
      </div>
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        <span>{label}</span>
      </a>
    </li>
  );
}
