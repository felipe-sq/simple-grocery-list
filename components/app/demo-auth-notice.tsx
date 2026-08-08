import { Info } from 'lucide-react';

/**
 * Shown on every auth screen. The sign-in is a UI demonstration with no server
 * behind it — leaving that unsaid would make the screen read as either broken
 * or deceptive, so it is stated plainly wherever credentials are requested.
 */
export function DemoAuthNotice() {
  return (
    <div className="bg-muted text-muted-foreground flex gap-2 rounded-lg p-3 text-xs">
      <Info className="mt-px size-4 shrink-0" aria-hidden />
      <p>
        <strong className="text-foreground font-medium">Demo only.</strong> No account is created
        and nothing is sent to a server. Any valid-looking email and a password of six or more
        characters will get you in — your password is never stored.
      </p>
    </div>
  );
}
