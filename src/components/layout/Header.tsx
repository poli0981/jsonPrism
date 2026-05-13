import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Github } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { cn } from '@/lib/utils';

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-6 px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <BrandMark className="h-7 w-7" />
          <span className="font-display text-xl leading-none tracking-tight">
            JSON<span className="text-spectrum italic">Prism</span>
          </span>
        </Link>

        <nav className="ml-6 hidden gap-1 md:flex">
          <NavItem to="/" end>
            {t('nav.home')}
          </NavItem>
          <NavItem to="/about">{t('nav.about')}</NavItem>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <a
            href="https://github.com/poli0981/jsonprism"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-md transition"
            aria-label={t('nav.github')}
          >
            <Github className="h-4 w-4" />
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
          'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition',
          isActive
            ? 'text-foreground bg-muted/60'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
        )
      }
    >
      {children}
    </NavLink>
  );
}

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
    </svg>
  );
}
