// iOS-system-inspired design tokens, light + dark.

export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  separator: string;
};

const light: ThemeColors = {
  background: '#F2F2F7',
  foreground: '#000000',
  card: '#FFFFFF',
  cardForeground: '#000000',
  primary: '#007AFF',
  primaryForeground: '#FFFFFF',
  secondary: '#F2F2F7',
  secondaryForeground: '#000000',
  muted: '#F2F2F7',
  mutedForeground: '#8E8E93',
  accent: '#34C759',
  accentForeground: '#FFFFFF',
  destructive: '#FF3B30',
  destructiveForeground: '#FFFFFF',
  border: '#E5E5EA',
  input: '#E5E5EA',
  separator: '#C6C6C8',
};

const dark: ThemeColors = {
  background: '#000000',
  foreground: '#FFFFFF',
  card: '#1C1C1E',
  cardForeground: '#FFFFFF',
  primary: '#0A84FF',
  primaryForeground: '#FFFFFF',
  secondary: '#2C2C2E',
  secondaryForeground: '#FFFFFF',
  muted: '#2C2C2E',
  mutedForeground: '#8E8E93',
  accent: '#30D158',
  accentForeground: '#FFFFFF',
  destructive: '#FF453A',
  destructiveForeground: '#FFFFFF',
  border: '#38383A',
  input: '#38383A',
  separator: '#3A3A3C',
};

export const RADIUS = 12;

export default { light, dark };
