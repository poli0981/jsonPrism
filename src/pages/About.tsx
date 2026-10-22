import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ClipboardCopy, ExternalLink, Heart, Mail, ShieldCheck, Users } from 'lucide-react';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import {
  BlueskyIcon,
  DiscordIcon,
  MastodonIcon,
  TelegramIcon,
  XIcon,
  YoutubeIcon,
} from '@/components/common/SocialIcons';
import { toast } from '@/components/ui/sonner';
import { CONTACTS, REPO_URL, SITE_URL, legalDocUrl } from '@/lib/links';
import { recentLogs } from '@/lib/logger';
import { tauriHostInfo } from '@/lib/tauri';

interface CommunityPlatform {
  key: 'discord' | 'x' | 'bluesky' | 'mastodon' | 'telegram' | 'youtube';
  url: string;
  icon: React.ReactNode;
}

const COMMUNITY: CommunityPlatform[] = [
  { key: 'discord', url: 'https://discord.gg/2aNR3aVt', icon: <DiscordIcon className="h-4 w-4" /> },
  { key: 'x', url: 'https://twitter.com/SkullMute0011', icon: <XIcon className="h-4 w-4" /> },
  {
    key: 'bluesky',
    url: 'https://bsky.app/profile/skullmute0011.bsky.social',
    icon: <BlueskyIcon className="h-4 w-4" />,
  },
  {
    key: 'mastodon',
    url: 'https://mastodon.social/@skullmute1122',
    icon: <MastodonIcon className="h-4 w-4" />,
  },
  {
    key: 'telegram',
    url: 'https://t.me/SkullMute0011',
    icon: <TelegramIcon className="h-4 w-4" />,
  },
  {
    key: 'youtube',
    url: 'https://youtube.com/@SkullMute',
    icon: <YoutubeIcon className="h-4 w-4" />,
  },
];

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
  key: 'ui' | 'editor' | 'parsers' | 'build' | 'tauri' | 'i18n' | 'web';
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
      { name: 'TypeScript 7', url: 'https://www.typescriptlang.org/' },
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
  {
    key: 'web',
    deps: [
      { name: 'Cloudflare Workers', url: 'https://workers.cloudflare.com/' },
      { name: 'Cloudflare Turnstile', url: 'https://www.cloudflare.com/products/turnstile/' },
      { name: 'Cloudflare Web Analytics', url: 'https://www.cloudflare.com/web-analytics/' },
    ],
  },
];

const CONTACT_ROWS: Array<{ key: keyof typeof CONTACTS; email: string }> = [
  { key: 'code', email: CONTACTS.code },
  { key: 'security', email: CONTACTS.security },
  { key: 'privacy', email: CONTACTS.privacy },
  { key: 'legal', email: CONTACTS.legal },
  { key: 'sponsor', email: CONTACTS.sponsor },
];

const cardLink =
  'border-border/70 bg-card/60 hover:border-primary/40 hover:bg-card inline-flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition';

export function About() {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const platform = __IS_TAURI_BUILD__ ? (__IS_ANDROID_BUILD__ ? 'android' : 'desktop') : 'web';

  return (
    // Layout's <main> is `flex flex-1 min-h-0 flex-col` (height-bounded). The
    // About page has many sections, so it needs its own scroll container —
    // otherwise content overflows past the Footer. The relative wrapper anchors
    // the floating scroll-to-top button above the Footer.
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* React 19 hoists this into <head>, ahead of index.html's title. */}
      <title>{t('about.title')}</title>
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label={t('about.title')}
        className="min-h-0 flex-1 overflow-y-auto outline-none"
      >
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="label-mono mb-2">{t('about.kicker')}</p>
          <h1 className="text-spectrum mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {t('about.title')}
          </h1>
          <p className="text-foreground/90 mb-8 text-xl">{t('about.lead')}</p>
          <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
            <p>{t('about.p1')}</p>
            <p>{t('about.p2')}</p>
          </div>

          {/* Privacy summary for this build */}
          <Section
            icon={<ShieldCheck className="text-success h-5 w-5" aria-hidden />}
            title={t('about.privacy.title')}
          >
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t(`about.privacy.${platform}`)}
            </p>
            <p className="mt-3 text-sm">
              <a
                href={legalDocUrl('PRIVACY.md')}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {t('about.privacy.read_policy')}
              </a>
            </p>
          </Section>

          {/* Donate */}
          <Section
            icon={<Heart className="text-prism-rose h-5 w-5" aria-hidden />}
            title={t('about.donate.title')}
          >
            <p className="text-muted-foreground mb-4 text-sm">{t('about.donate.lead')}</p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {DONATE.map((platformItem) => (
                <li key={platformItem.key}>
                  <a href={platformItem.url} target="_blank" rel="noreferrer" className={cardLink}>
                    <span className="text-foreground font-medium">
                      {t(`about.donate.${platformItem.key}`)}
                    </span>
                    <ExternalLink className="text-muted-foreground h-3.5 w-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </Section>

          {/* Community */}
          <Section
            icon={<Users className="text-primary h-5 w-5" aria-hidden />}
            title={t('about.community.title')}
          >
            <p className="text-muted-foreground mb-4 text-sm">{t('about.community.lead')}</p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {COMMUNITY.map((item) => (
                <li key={item.key}>
                  <a href={item.url} target="_blank" rel="noreferrer" className={cardLink}>
                    <span className="text-muted-foreground inline-flex items-center gap-2">
                      {item.icon}
                      <span className="text-foreground font-medium">
                        {t(`about.community.${item.key}`)}
                      </span>
                    </span>
                    <ExternalLink className="text-muted-foreground h-3.5 w-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </Section>

          {/* Contact */}
          <Section
            icon={<Mail className="text-prism-cyan h-5 w-5" aria-hidden />}
            title={t('about.contact.title')}
          >
            <p className="text-muted-foreground mb-3 text-sm">{t('about.contact.lead')}</p>
            <dl className="border-border/70 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 border-t pt-3 text-sm">
              {CONTACT_ROWS.map((row) => (
                <div key={row.key} className="contents">
                  <dt className="text-muted-foreground">{t(`about.contact.${row.key}`)}</dt>
                  <dd>
                    <a href={`mailto:${row.email}`} className="font-mono hover:underline">
                      {row.email}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* Third-party */}
          <Section title={t('about.third_party.title')}>
            <p className="text-muted-foreground mb-4 text-sm">{t('about.third_party.lead')}</p>
            <div className="space-y-4">
              {DEPS.map((cat) => (
                <div key={cat.key}>
                  <h3 className="label-mono mb-1.5">{t(`about.third_party.${cat.key}`)}</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {cat.deps.map((dep) => (
                      <li key={dep.name}>
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noreferrer"
                          className="border-border/70 bg-card/60 hover:border-primary/40 hover:text-foreground text-muted-foreground inline-flex min-h-7 items-center gap-1 rounded border px-2 font-mono text-xs transition"
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
                href={legalDocUrl('THIRD-PARTY.md')}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {t('about.third_party.see_full_list')}
              </a>
            </p>
          </Section>

          {/* Build info */}
          <Section title={t('about.build.title')}>
            <dl className="border-border/70 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 border-t pt-4 font-mono text-sm">
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
              <dt className="text-muted-foreground">{t('about.build.platform')}</dt>
              <dd className="text-foreground">{t(`about.build.platform_${platform}`)}</dd>
            </dl>
            <CopyDiagnosticsButton />
          </Section>

          {/* Links */}
          <Section title={t('about.links.title')}>
            <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
              <LinkRow href={REPO_URL} label={t('about.links.repo')} />
              <LinkRow href={`${REPO_URL}/issues`} label={t('about.links.issues')} />
              <LinkRow href={`${REPO_URL}/discussions`} label={t('about.links.discussions')} />
              <LinkRow href={SITE_URL} label={t('about.links.demo')} />
              <LinkRow href={`${REPO_URL}/releases`} label={t('about.links.releases')} />
              <LinkRow href={legalDocUrl('LICENSE')} label={t('about.links.license')} />
            </ul>
          </Section>

          {/* Disclaimer */}
          <Section title={t('about.disclaimer.title')}>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('about.disclaimer.body')}
            </p>
          </Section>

          <div className="border-border/70 text-muted-foreground mt-12 border-t pt-6 font-mono text-xs">
            {t('about.version', { version: __APP_VERSION__ })}
          </div>
        </div>
      </div>
      <ScrollToTop scrollRef={scrollRef} />
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground inline-flex min-h-8 items-center gap-1.5 transition"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        <span>{label}</span>
      </a>
    </li>
  );
}

/** Copies version, platform and recent local log lines for bug reports. Nothing is sent anywhere. */
function CopyDiagnosticsButton() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const host = await tauriHostInfo().catch(() => null);
    const lines = [
      `JSONPrism ${__APP_VERSION__} (${__APP_COMMIT__}, built ${__APP_BUILD_DATE__})`,
      `Platform: ${__IS_TAURI_BUILD__ ? __TAURI_PLATFORM__ : 'web'}${host ? ` · ${host.os} ${host.arch}` : ''}`,
      `User agent: ${navigator.userAgent}`,
      `Language: ${document.documentElement.lang}`,
      '',
      'Recent log:',
      ...recentLogs(50).map((e) => `${e.time} ${e.level.toUpperCase()} [${e.scope}] ${e.message}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      toast.success(t('about.build.diagnostics_copied'));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('toast.copy_failed'));
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="border-border hover:bg-muted mt-4 inline-flex min-h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition"
    >
      {copied ? (
        <Check className="text-success motion-safe:animate-pop h-3.5 w-3.5" aria-hidden />
      ) : (
        <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
      )}
      {t('about.build.copy_diagnostics')}
    </button>
  );
}
