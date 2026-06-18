import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NestableDraggableFlatList, RenderItemParams } from 'react-native-draggable-flatlist';

import { GroceryItemRow } from '@/components/GroceryItemRow';
import type { AisleGroup, GroceryItemWithAisle } from '@/types';

type Props = {
  group: AisleGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  onToggleItem: (itemId: string) => void;
  onLongPressItem?: (item: GroceryItemWithAisle) => void;
  onReorderItems: (aisleId: string, items: GroceryItemWithAisle[]) => void;
};

export function AisleSection({ group, isCollapsed, onToggle, onToggleItem, onLongPressItem, onReorderItems }: Props) {
  const { aisle, items } = group;
  const total = items.length;
  const checkedCount = items.filter((i) => i.checked).length;

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<GroceryItemWithAisle>) => (
      <GroceryItemRow
        item={item}
        onToggle={() => onToggleItem(item.id)}
        onLongPress={onLongPressItem}
        drag={drag}
        isActive={isActive}
      />
    ),
    [onToggleItem, onLongPressItem],
  );

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

      {!isCollapsed && (
        <NestableDraggableFlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => onReorderItems(aisle.id, data)}
          scrollEnabled={false}
        />
      )}
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
