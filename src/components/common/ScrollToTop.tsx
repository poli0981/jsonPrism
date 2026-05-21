import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  /** The scroll container to watch and scroll back to top. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Reveal the button once the container is scrolled past this many pixels. */
  threshold?: number;
}

export function ScrollToTop({ scrollRef, threshold = 320 }: ScrollToTopProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > threshold);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef, threshold]);

  const handleClick = () => {
    const el = scrollRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t('common.scroll_to_top')}
      title={t('common.scroll_to_top')}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        'absolute right-4 bottom-4 z-20 inline-flex h-10 w-10 items-center justify-center',
        'border-border/60 bg-card/90 text-muted-foreground rounded-full border shadow-sm',
        'hover:border-primary/40 hover:bg-card hover:text-foreground backdrop-blur-sm transition',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
