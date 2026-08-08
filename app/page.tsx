'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useHydrated } from '@/components/providers';
import { useStore } from '@/lib/store';

/**
 * Entry point. The destination depends on sessionStorage, which can only be
 * read after mount, so this renders nothing and redirects once hydrated.
 */
export default function RootPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useStore((s) => s.session);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(session ? '/lists' : '/sign-in');
  }, [hydrated, session, router]);

  return null;
}
