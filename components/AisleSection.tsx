import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GroceryItemRow } from '@/components/GroceryItemRow';
import type { AisleGroup, GroceryItemWithAisle } from '@/types';

type Props = {
  group: AisleGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  onToggleItem: (itemId: string) => void;
  onLongPressItem?: (item: GroceryItemWithAisle) => void;
};

export function AisleSection({ group, isCollapsed, onToggle, onToggleItem, onLongPressItem }: Props) {
  const { aisle, items } = group;
  const total = items.length;
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.header}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${aisle.name}, ${checkedCount} of ${total} checked, ${isCollapsed ? 'collapsed' : 'expanded'}`}
      >
        <Text style={styles.chevron}>{isCollapsed ? '▶' : '▼'}</Text>
        <Text style={styles.aisleName}>{aisle.name}</Text>
        <Text style={styles.count}>
          {checkedCount} of {total} ✓
        </Text>
      </Pressable>

      {!isCollapsed &&
        items.map((item) => (
          <GroceryItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggleItem(item.id)}
            onLongPress={onLongPressItem}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  chevron: {
    fontSize: 10,
    color: '#6b7280',
    marginRight: 8,
    width: 12,
  },
  aisleName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 0.2,
  },
  count: {
    fontSize: 13,
    color: '#6b7280',
  },
});
