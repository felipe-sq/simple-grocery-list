'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { DemoNotice } from '@/components/app/demo-notice';
import { ListsSidebar } from '@/components/app/lists-sidebar';
import { useHydrated } from '@/components/providers';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Responsive shell. Below `md` the sidebar and the detail pane are two separate
 * full-screen views and the URL decides which one is mounted — the same stacked
 * flow the RN app had. From `md` up both panes are visible at once.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useStore((s) => s.session);

  // Route guard. It has to wait for hydration, otherwise the first client render
  // always sees a null session and bounces a signed-in visitor to /sign-in.
  useEffect(() => {
    if (hydrated && !session) router.replace('/sign-in');
  }, [hydrated, session, router]);

  const onIndex = pathname === '/lists';

  if (hydrated && !session) return null;

  return (
    <div className="flex h-dvh flex-col">
      <DemoNotice />
      <div className="grid min-h-0 flex-1 md:grid-cols-[clamp(280px,26vw,360px)_1fr]">
        <aside
          className={cn(
            'bg-background border-border min-h-0 md:border-r',
            onIndex ? 'block' : 'hidden md:block',
          )}
        >
          <ListsSidebar />
        </aside>
        <main className={cn('min-h-0', onIndex ? 'hidden md:block' : 'block')}>{children}</main>
      </div>
    </div>
  );
}
