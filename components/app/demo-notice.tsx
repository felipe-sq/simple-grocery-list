'use client';

import { X } from 'lucide-react';

import { useHydrated } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';

/**
 * Sets expectations before a visitor invests any effort: this is a demo, the
 * data is local to the tab, and the sign-in creates no real account. Dismissal
 * is stored alongside the rest of the state, so it stays gone for the session.
 */
export function DemoNotice() {
  const hydrated = useHydrated();
  const dismissed = useStore((s) => s.demoNoticeDismissed);
  const dismiss = useStore((s) => s.dismissDemoNotice);

  if (!hydrated || dismissed) return null;

  return (
    <div className="bg-primary text-primary-foreground flex items-center gap-3 px-4 py-2 text-sm">
      <p className="flex-1 text-balance">
        Demo build — your lists are stored in this browser tab only and are cleared when you close
        it. No account is created and nothing is sent to a server.
      </p>
      <Button
        variant="ghost"
        size="icon"
        onClick={dismiss}
        aria-label="Dismiss demo notice"
        className="hover:bg-primary-foreground/15 hover:text-primary-foreground size-7 shrink-0"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
