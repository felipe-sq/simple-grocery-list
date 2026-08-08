'use client';

import { ChevronLeft, ExternalLink, LogOut, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog, type ConfirmRequest } from '@/components/app/confirm-dialog';
import { useHydrated, useMounted } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();

  // next-themes has no value on the server, so the selected state is withheld
  // until after hydration rather than guessed.
  const activeTheme = mounted ? theme : undefined;

  const session = useStore((s) => s.session);
  const signOut = useStore((s) => s.signOut);
  const resetDemo = useStore((s) => s.resetDemo);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 px-3 pt-4 pb-2 md:pt-6">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link href="/lists" aria-label="Back to lists">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto w-full max-w-md space-y-6">
          <section className="bg-card rounded-lg p-4">
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              Account
            </h2>
            <p className="font-medium">{hydrated ? (session?.displayName ?? 'Guest') : '—'}</p>
            <p className="text-muted-foreground text-sm">{hydrated ? (session?.email ?? '') : ''}</p>
            <p className="text-muted-foreground mt-3 text-xs">
              This is a demo account held in your browser tab. No account exists on any server.
            </p>
          </section>

          <section className="bg-card rounded-lg p-4">
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              Appearance
            </h2>
            <div className="flex gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={activeTheme === value}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-colors',
                    activeTheme === value
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-card rounded-lg p-4">
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              About
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Built with</dt>
                <dd className="text-right">Next.js · React · TypeScript · Tailwind</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Storage</dt>
                <dd className="text-right">Browser session only</dd>
              </div>
            </dl>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="https://www.felipesq.dev">
                Back to felipesq.dev
                <ExternalLink className="size-4" />
              </Link>
            </Button>
          </section>

          <section className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                setConfirm({
                  title: 'Reset the demo?',
                  description:
                    'Your lists are replaced with the original sample data and you are signed out.',
                  confirmLabel: 'Reset demo',
                  destructive: true,
                  onConfirm: () => {
                    resetDemo();
                    router.replace('/sign-in');
                  },
                })
              }
            >
              <RotateCcw className="size-4" />
              Reset demo data
            </Button>

            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive w-full"
              onClick={() => {
                signOut();
                router.replace('/sign-in');
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </section>
        </div>
      </div>

      <ConfirmDialog request={confirm} onOpenChange={(open) => !open && setConfirm(null)} />
    </div>
  );
}
