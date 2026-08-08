'use client';

import Link from 'next/link';
import { useState } from 'react';

import { DemoAuthNotice } from '@/components/app/demo-auth-notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateEmail } from '@/lib/demo-auth';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = validateEmail(email);
    if (message) {
      setError(message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <DemoAuthNotice />
        <div className="bg-card space-y-2 rounded-lg p-4">
          <h2 className="font-semibold">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            In a real build this is where a reset link would be sent to{' '}
            <span className="text-foreground">{email.trim()}</span>. Nothing was actually sent.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    );
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

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full">
        Send reset link
      </Button>

      <p className="text-center text-sm">
        <Link href="/sign-in" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
