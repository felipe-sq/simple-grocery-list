import { Text, TouchableOpacity, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';

export const TAG_COLORS = [
  '#007AFF',
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#5AC8FA',
  '#AF52DE',
  '#FF2D55',
  '#00C7BE',
  '#FF6B35',
];

export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface Props {
  tag: string;
  color?: string;
  onPress?: () => void;
  small?: boolean;
}

export function TagPill({ tag, color, onPress, small }: Props) {
  const bg = color ?? getTagColor(tag);
  const styles = useThemedStyles(() => ({
    pill: {
      paddingHorizontal: small ? 6 : 9,
      paddingVertical: small ? 2 : 3,
      borderRadius: 100,
      borderWidth: 1,
      backgroundColor: `${bg}18`,
      borderColor: `${bg}55`,
    },
    text: {
      fontSize: small ? 10 : 12,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
      color: bg,
    },
  }));

  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.7} style={styles.pill}>
      <Text style={styles.text}>{tag}</Text>
    </Wrapper>
  );
}
