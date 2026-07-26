import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { CheckCircle } from '@/components/CheckCircle';
import { TagPill, getTagColor } from '@/components/TagPill';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { alert } from '@/lib/alert';
import type { GroceryItem } from '@/types';

interface Props {
  item: GroceryItem;
  onToggle: () => void;
  onDelete: () => void;
  onPress?: () => void;
  onTagPress?: () => void;
}

function confirmDelete(name: string, onDelete: () => void) {
  alert('Delete item?', `"${name}" will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

function RowContent({ item, onToggle, onDelete, onPress, onTagPress, showDeleteButton }: Props & { showDeleteButton?: boolean }) {
  const colors = useThemeColors();
  const tagColor = item.tag ? getTagColor(item.tag) : undefined;

  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 13,
      gap: 12,
      borderBottomWidth: 0.5,
      backgroundColor: c.card,
      borderBottomColor: c.border,
      opacity: item.checked ? 0.6 : 1,
    },
    content: { flex: 1 },
    name: {
      fontSize: 16,
      lineHeight: 20,
      color: c.foreground,
      textDecorationLine: (item.checked ? 'line-through' : 'none') as 'line-through' | 'none',
    },
    note: { fontSize: 13, marginTop: 2, color: c.mutedForeground },
    pendingIcon: { fontSize: 14, color: '#d97706' },
    webDeleteBtn: { padding: 4 },
  }));

  const quantityLabel =
    item.quantity !== null && item.unit
      ? `${item.quantity} ${item.unit}`
      : item.quantity !== null
        ? String(item.quantity)
        : null;
  const label = quantityLabel ? `${item.name} (${quantityLabel})` : item.name;

  return (
    <View style={styles.row}>
      <CheckCircle
        checked={item.checked}
        color={tagColor ?? undefined}
        onPress={onToggle}
        accessibilityLabel={`${label}, ${item.checked ? 'checked' : 'unchecked'}`}
      />
      {/* RN Pressable, not TouchableOpacity: inside RNGH's ReanimatedSwipeable
          TouchableOpacity taps are swallowed (see design.md §8), Pressable's are not. */}
      <Pressable
        style={styles.content}
        onPress={onPress}
        disabled={onPress === undefined}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Edit ${item.name}` : undefined}
      >
        <Text style={styles.name} numberOfLines={2}>
          {label}
        </Text>
        {item.notes ? (
          <Text style={styles.note} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </Pressable>
      {item.pending_sync && <Text style={styles.pendingIcon}>⚠</Text>}
      {item.tag ? <TagPill tag={item.tag} color={tagColor} onPress={onTagPress} small /> : null}
      {showDeleteButton ? (
        <TouchableOpacity
          onPress={() => confirmDelete(item.name, onDelete)}
          hitSlop={8}
          style={styles.webDeleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.name}`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ItemRow({ item, onToggle, onDelete, onPress, onTagPress }: Props) {
  const colors = useThemeColors();
  const styles = useThemedStyles((c) => ({
    deleteAction: {
      width: 76,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: c.destructive,
    },
  }));

  if (Platform.OS === 'web') {
    return (
      <RowContent item={item} onToggle={onToggle} onDelete={onDelete} onPress={onPress} onTagPress={onTagPress} showDeleteButton />
    );
  }

  const renderRightActions = (_prog: unknown, _drag: unknown, swipeable: SwipeableMethods) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => {
        swipeable.close();
        confirmDelete(item.name, onDelete);
      }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Delete ${item.name}`}
    >
      <Ionicons name="trash-outline" size={20} color={colors.destructiveForeground} />
    </TouchableOpacity>
  );

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      rightThreshold={40}
      friction={2}
      overshootRight={false}
    >
      <RowContent item={item} onToggle={onToggle} onDelete={onDelete} onPress={onPress} onTagPress={onTagPress} />
    </ReanimatedSwipeable>
  );
}
