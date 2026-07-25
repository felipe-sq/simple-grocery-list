import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

// Theme-aware replacement for module-scope StyleSheet.create():
//   const styles = useThemedStyles((c) => ({ row: { backgroundColor: c.card } }));
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useThemeColors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}
