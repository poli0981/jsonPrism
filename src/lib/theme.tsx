import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { safeGetItem, safeSetItem } from './safe-storage';
import {
  applyTheme,
  isTheme,
  subscribeSystemTheme,
  systemTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from './theme-dom';

export type { Theme } from './theme-dom';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = safeGetItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : defaultTheme;
  });
  // The OS preference is an external store; deriving from it avoids syncing
  // state inside effects.
  const system = useSyncExternalStore(subscribeSystemTheme, systemTheme, () => 'dark' as const);
  const resolvedTheme: ResolvedTheme = theme === 'system' ? system : theme;

  // Layout effect: runs before paint, so a theme change never flashes.
  useLayoutEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((t: Theme) => {
    safeSetItem(THEME_STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
