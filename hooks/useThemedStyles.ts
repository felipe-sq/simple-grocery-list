import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

// Theme-aware replacement for module-scope StyleSheet.create():
//   const styles = useThemedStyles((c) => ({ row: { backgroundColor: c.card } }));
//
// Deliberately NOT wrapped in useMemo: factories may close over component
// state/props (e.g. a chip's `selected`), and memoizing on the color object
// alone froze those styles. The React Compiler memoizes this correctly by
// tracking everything the factory captures.
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useThemeColors();
  return StyleSheet.create(factory(colors));
}
