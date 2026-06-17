import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GroceryItemWithAisle } from '@/types';

type Props = {
  item: GroceryItemWithAisle;
  onToggle: () => void;
  onLongPress?: (item: GroceryItemWithAisle) => void;
};

export function GroceryItemRow({ item, onToggle, onLongPress }: Props) {
  const quantityLabel =
    item.quantity !== null && item.unit
      ? `${item.quantity} ${item.unit}`
      : item.quantity !== null
        ? String(item.quantity)
        : null;

  const label = quantityLabel ? `${item.name} (${quantityLabel})` : item.name;

  return (
    <Pressable
      style={[styles.row, item.checked && styles.rowChecked]}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      delayLongPress={400}
      accessibilityLabel={`${item.name}, long press for options`}
    >
      <Pressable
        style={({ pressed }) => [
          styles.circle,
          item.checked && styles.circleChecked,
          pressed && styles.circlePressed,
        ]}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={`${item.name}, ${item.checked ? 'checked' : 'unchecked'}`}
        hitSlop={8}
      >
        {item.checked && <View style={styles.checkFill} />}
      </Pressable>
      <Text
        style={[styles.name, item.checked && styles.nameChecked]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {item.pending_sync && <Text style={styles.pendingIcon}>⚠</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  rowChecked: {
    opacity: 0.4,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9ca3af',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  circleChecked: {
    borderColor: '#2563eb',
  },
  circlePressed: {
    opacity: 0.6,
  },
  checkFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  name: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  nameChecked: {
    textDecorationLine: 'line-through',
    color: '#374151',
  },
  pendingIcon: {
    fontSize: 14,
    color: '#d97706',
    marginLeft: 8,
  },
});
