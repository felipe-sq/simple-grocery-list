import { StyleSheet, Text, View } from 'react-native';

import type { GroceryItemWithAisle } from '@/types';

type Props = {
  item: GroceryItemWithAisle;
};

export function GroceryItemRow({ item }: Props) {
  const quantityLabel =
    item.quantity !== null && item.unit
      ? `${item.quantity} ${item.unit}`
      : item.quantity !== null
        ? String(item.quantity)
        : null;

  const label = quantityLabel ? `${item.name} (${quantityLabel})` : item.name;

  return (
    <View style={[styles.row, item.checked && styles.rowChecked]}>
      <View style={[styles.circle, item.checked && styles.circleChecked]}>
        {item.checked && <View style={styles.checkFill} />}
      </View>
      <Text
        style={[styles.name, item.checked && styles.nameChecked]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
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
});
