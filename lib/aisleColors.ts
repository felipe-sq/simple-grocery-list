export type AisleColorKey = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'pink' | 'teal' | 'gray';

export type AisleColorTheme = {
  bg: string;
  border: string;
  text: string;
};

export const AISLE_PALETTE: Record<AisleColorKey, AisleColorTheme> = {
  blue:   { bg: '#dbeafe', border: '#bfdbfe', text: '#1d4ed8' },
  green:  { bg: '#dcfce7', border: '#bbf7d0', text: '#166534' },
  amber:  { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  red:    { bg: '#fee2e2', border: '#fecaca', text: '#991b1b' },
  purple: { bg: '#ede9fe', border: '#ddd6fe', text: '#5b21b6' },
  pink:   { bg: '#fce7f3', border: '#fbcfe8', text: '#9d174d' },
  teal:   { bg: '#ccfbf1', border: '#99f6e4', text: '#0f766e' },
  gray:   { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151' },
};

export const AISLE_COLOR_KEYS: AisleColorKey[] = ['blue', 'green', 'amber', 'red', 'purple', 'pink', 'teal', 'gray'];

export const DEFAULT_AISLE_COLOR: AisleColorKey = 'blue';

export function getAisleTheme(color: string | null | undefined): AisleColorTheme {
  const key = color as AisleColorKey | null | undefined;
  return AISLE_PALETTE[key ?? DEFAULT_AISLE_COLOR] ?? AISLE_PALETTE[DEFAULT_AISLE_COLOR];
}
