/**
 * Validation for the demo sign-in. There is no server, so this only checks that
 * the input *looks* like credentials — enough to exercise the form's error
 * states without pretending to authenticate anyone.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 6;

export function validateCredentials(email: string, password: string): string | null {
  if (!email.trim() || !password) return 'Enter your email and password.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'That email address does not look right.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'That email address does not look right.';
  return null;
}
