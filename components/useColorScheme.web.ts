import { useEffect, useState } from 'react';

// Two-phase scheme detection: the static web export is server-rendered with
// no `window`, so the first client render MUST also be 'light' or React
// hydration mismatches leave stale styles on parts of the tree (dark cards
// on a light background). The real scheme applies in an effect after mount.
export function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setScheme(mql.matches ? 'dark' : 'light');
    let active = true;
    queueMicrotask(() => {
      if (active) apply();
    });
    mql.addEventListener('change', apply);
    return () => {
      active = false;
      mql.removeEventListener('change', apply);
    };
  }, []);

  return scheme;
}
