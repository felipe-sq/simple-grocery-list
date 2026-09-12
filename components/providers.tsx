'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

import { useStore } from '@/lib/store';

/**
 * Zustand's persist middleware runs with skipHydration, so sessionStorage is
 * read here — after mount — rather than during render. Any component that shows
 * store data must wait for `useHydrated()`, otherwise the server-rendered
 * markup (seed data) and the first client render (persisted data) disagree and
 * React throws a hydration mismatch.
 *
 * Hydration state is read through useSyncExternalStore rather than mirrored
 * into useState: the persist middleware already is an external store, and
 * subscribing to it directly keeps the server snapshot (`false`) explicit.
 */

function subscribeToHydration(onStoreChange: () => void): () => void {
  return useStore.persist.onFinishHydration(onStoreChange);
}

function getHydrationSnapshot(): boolean {
  return useStore.persist.hasHydrated();
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
}

function noopSubscribe(): () => void {
  return () => {};
}

function alwaysTrue(): boolean {
  return true;
}

function alwaysFalse(): boolean {
  return false;
}

/**
 * False during SSR and on the hydrating render, true afterwards. Needed by any
 * UI whose value only exists in the browser — the theme toggle reads
 * next-themes, which resolves to undefined on the server and would otherwise
 * mismatch on hydration.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, alwaysTrue, alwaysFalse);
}

function StoreHydration({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);

  // iOS occasionally resumes a backgrounded home-screen app (or a bfcache
  // restore) without repainting DOM updates that already committed while it
  // was away — the sidebar item counts look frozen even though the
  // underlying state is correct. Forcing a reflow on resume is the standard
  // workaround; it's a visual nudge only, no state or storage is touched.
  useEffect(() => {
    function forceRepaint() {
      if (document.visibilityState !== 'visible') return;
      const { style } = document.documentElement;
      style.display = 'none';
      void document.documentElement.offsetHeight;
      style.display = '';
    }

    document.addEventListener('visibilitychange', forceRepaint);
    window.addEventListener('pageshow', forceRepaint);
    return () => {
      document.removeEventListener('visibilitychange', forceRepaint);
      window.removeEventListener('pageshow', forceRepaint);
    };
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <StoreHydration>{children}</StoreHydration>
    </ThemeProvider>
  );
}
