'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DemoAuthNotice } from '@/components/app/demo-auth-notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateCredentials } from '@/lib/demo-auth';
import { useStore } from '@/lib/store';

export default function SignInPage() {
  const router = useRouter();
  const signIn = useStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = validateCredentials(email, password);
    if (message) {
      setError(message);
      return;
    }
    signIn(email.trim());
    router.replace('/lists');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DemoAuthNotice />

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error !== null}
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error !== null}
        />
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full">
        Sign in
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/reset-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
        <Link href="/sign-up" className="text-primary hover:underline">
          Create an account
        </Link>
      </div>

      <p className="text-muted-foreground pt-2 text-center text-xs">
        <Link href="https://www.felipesq.dev" className="hover:text-foreground underline">
          Back to felipesq.dev
        </Link>
      </p>
    </form>
  );
}
