import { Link, NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { GithubIcon } from '@/components/common/SocialIcons';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { REPO_URL } from '@/lib/links';
import { cn } from '@/lib/utils';
import { AppearanceMenu } from './AppearanceMenu';

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-1.5 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:gap-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2" aria-label={t('nav.home_brand')}>
          <BrandMark className="h-7 w-7" />
          <span className="font-display hidden text-lg leading-none font-semibold tracking-tight sm:inline">
            JSON<span className="text-spectrum">Prism</span>
          </span>
          <span className="label-mono hidden normal-case lg:inline">
            v{__APP_VERSION__} · {__APP_COMMIT__}
          </span>
        </Link>

        <nav className="flex gap-0.5 md:ml-4 md:gap-1" aria-label={t('nav.label')}>
          <NavItem to="/" end>
            {t('nav.home')}
          </NavItem>
          <NavItem to="/about">{t('nav.about')}</NavItem>
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <LanguageSwitcher />
          <AppearanceMenu />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-9 w-9 items-center justify-center rounded-md transition sm:inline-flex"
            aria-label={t('nav.github')}
          >
            <GithubIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

interface NavItemProps {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}

function NavItem({ to, end, children }: NavItemProps) {
  return (
    <NavLink
      to={to}
      {...(end !== undefined ? { end } : {})}
      className={({ isActive }) =>
        cn(
          'relative inline-flex h-9 items-center rounded-md px-2 text-sm font-medium transition sm:px-3',
          isActive
            ? 'text-foreground after:bg-spectrum after:absolute after:inset-x-2 after:bottom-1 after:h-px'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        )
      }
    >
      {children}
    </NavLink>
  );
}

/** Light enters from the left, a prism splits it into four rays (they fan out on hover). */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <line
        x1="2"
        y1="32"
        x2="22"
        y2="32"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 12 L46 32 L22 52 Z"
        fill="transparent"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <g className="origin-[46px_32px] transition-transform duration-500 motion-safe:group-hover:scale-y-125">
        <line
          x1="46"
          y1="32"
          x2="62"
          y2="20"
          stroke="var(--color-prism-violet)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="46"
          y1="32"
          x2="62"
          y2="28"
          stroke="var(--color-prism-cyan)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="46"
          y1="32"
          x2="62"
          y2="36"
          stroke="var(--color-prism-amber)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="46"
          y1="32"
          x2="62"
          y2="44"
          stroke="var(--color-prism-rose)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
