import { useTranslation } from 'react-i18next';
import { BlueskyIcon, DiscordIcon, XIcon } from '@/components/common/SocialIcons';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-border/70 text-muted-foreground border-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="font-mono">JSONPrism · v{__APP_VERSION__} · Apache-2.0</div>
        <div className="flex items-center gap-1">
          <SocialLink
            href="https://discord.gg/2aNR3aVt"
            label={t('social.discord')}
            icon={<DiscordIcon className="h-3.5 w-3.5" />}
          />
          <SocialLink
            href="https://twitter.com/SkullMute0011"
            label={t('social.x')}
            icon={<XIcon className="h-3.5 w-3.5" />}
          />
          <SocialLink
            href="https://bsky.app/profile/skullmute0011.bsky.social"
            label={t('social.bluesky')}
            icon={<BlueskyIcon className="h-3.5 w-3.5" />}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span>{t('footer.built_by')}</span>
          <a
            href="https://github.com/poli0981"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            poli0981 (Kokone)
          </a>
        </div>
      </div>
    </footer>
  );
}

interface SocialLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function SocialLink({ href, label, icon }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="hover:text-foreground hover:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-md transition motion-safe:hover:-translate-y-px"
    >
      {icon}
    </a>
  );
}
