import Colors, { type ThemeColors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
