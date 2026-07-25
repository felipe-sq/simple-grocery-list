import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { List } from '@/types';

const FALLBACK_ICONS = ['cart', 'basket', 'storefront', 'bag', 'pricetag'] as const;
type IoniconName = keyof typeof Ionicons.glyphMap;

function getFallbackIcon(name: string): IoniconName {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_ICONS[Math.abs(hash) % FALLBACK_ICONS.length];
}

interface Props {
  list: List;
  remainingCount: number;
  totalCount: number;
  presentNames?: string[];
  onPress: () => void;
  onLongPress: () => void;
}

export function ListCard({ list, remainingCount, totalCount, presentNames, onPress, onLongPress }: Props) {
  const colors = useThemeColors();
  const listColor = list.color ?? colors.primary;
  const icon = (list.icon ?? getFallbackIcon(list.name)) as IoniconName;
  const isEmpty = totalCount === 0;
  const allDone = totalCount > 0 && remainingCount === 0;

  const styles = useThemedStyles((c) => ({
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      borderRadius: 14,
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: `${listColor}18`,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600' as const, marginBottom: 2, color: c.foreground },
    sub: { fontSize: 13, color: c.mutedForeground },
    right: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    badge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 6,
      backgroundColor: listColor,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
    presenceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.accent,
    },
  }));

  const subtitle = isEmpty
    ? 'Empty list'
    : allDone
      ? 'All done'
      : `${remainingCount} item${remainingCount !== 1 ? 's' : ''} remaining`;

  const presenceLabel =
    presentNames && presentNames.length > 0 ? `${presentNames.join(', ')} shopping now` : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${list.name}, ${subtitle}. Long press for options`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={listColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {list.name}
        </Text>
        <Text style={styles.sub}>{presenceLabel ?? subtitle}</Text>
      </View>
      <View style={styles.right}>
        {presenceLabel !== null && <View style={styles.presenceDot} />}
        {remainingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{remainingCount > 99 ? '99+' : String(remainingCount)}</Text>
          </View>
        )}
        {allDone && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
        <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}
