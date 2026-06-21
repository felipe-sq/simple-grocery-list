import { useCallback } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { NestableDraggableFlatList, RenderItemParams } from 'react-native-draggable-flatlist';

import { GroceryItemRow } from '@/components/GroceryItemRow';
import { getAisleTheme } from '@/lib/aisleColors';
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
  const theme = getAisleTheme(aisle.color);

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

  const renderWebItem = useCallback(
    ({ item }: { item: GroceryItemWithAisle }) => (
      <GroceryItemRow
        item={item}
        onToggle={() => onToggleItem(item.id)}
        onLongPress={onLongPressItem}
      />
    ),
    [onToggleItem, onLongPressItem],
  );

  return (
    <View style={styles.section}>
      <Pressable
        style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${aisle.name}, ${checkedCount} of ${total} checked, ${isCollapsed ? 'collapsed' : 'expanded'}`}
      >
        <Text style={[styles.chevron, { color: theme.text }]}>{isCollapsed ? '▶' : '▼'}</Text>
        <Text style={[styles.aisleName, { color: theme.text }]}>{aisle.name}</Text>
        <Text style={[styles.count, { color: theme.text }]}>
          {checkedCount} of {total} ✓
        </Text>
      </Pressable>

      {!isCollapsed && (
        Platform.OS === 'web' ? (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderWebItem}
            scrollEnabled={false}
          />
        ) : (
          <NestableDraggableFlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragEnd={({ data }) => onReorderItems(aisle.id, data)}
            scrollEnabled={false}
          />
        )
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chevron: {
    fontSize: 10,
    marginRight: 8,
    width: 12,
  },
  aisleName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  count: {
    fontSize: 13,
  },
});
