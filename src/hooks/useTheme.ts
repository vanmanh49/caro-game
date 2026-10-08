import { useCallback, useEffect, useState } from 'react';
import { isThemeOrNull, type Theme } from '../utils/guards';
import { useLocalStorage } from './useLocalStorage';

const QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): Theme {
  try {
    return window.matchMedia(QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function useTheme() {
  const [stored, setStored] = useLocalStorage<Theme | null>('caro:theme', null, isThemeOrNull);
  const [system, setSystem] = useState<Theme>(systemTheme);

  useEffect(() => {
    let media: MediaQueryList;
    try {
      media = window.matchMedia(QUERY);
    } catch {
      return;
    }
    const onChange = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const theme: Theme = stored ?? system;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d1021' : '#f1f2fb');
  }, [theme]);

  const toggle = useCallback(() => setStored(theme === 'dark' ? 'light' : 'dark'), [theme, setStored]);
  return { theme, toggle, setTheme: setStored };
}
