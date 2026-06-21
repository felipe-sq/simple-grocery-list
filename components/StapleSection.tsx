import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { StapleGroup, StapleItemWithDetails } from '@/types';

type Props = {
  group: StapleGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  onItemPress: (item: StapleItemWithDetails) => void;
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  duplicateIds?: ReadonlySet<string>;
  onToggleSelection?: (item: StapleItemWithDetails) => void;
  onLongPressItem?: (item: StapleItemWithDetails) => void;
};

type RowProps = {
  item: StapleItemWithDetails;
  onPress: () => void;
  selectionMode: boolean;
  isSelected: boolean;
  isDuplicate: boolean;
  onLongPress?: () => void;
};

function StapleRow({ item, onPress, selectionMode, isSelected, isDuplicate, onLongPress }: RowProps) {
  const qtyUnit = [
    item.default_qty !== null ? String(item.default_qty) : null,
    item.default_unit ?? null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Pressable
      style={[rowStyles.row, isDuplicate && rowStyles.rowDuplicate]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityLabel={
        selectionMode
          ? isDuplicate
            ? `${item.name}, already on list`
            : `${item.name}, ${isSelected ? 'selected' : 'not selected'}`
          : `Edit ${item.name}`
      }
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityState={selectionMode ? { checked: isSelected, disabled: isDuplicate } : undefined}
    >
      {selectionMode && (
        <Text style={[rowStyles.checkbox, isDuplicate && rowStyles.checkboxDisabled]}>
          {isSelected ? '☑' : '□'}
        </Text>
      )}
      <View style={rowStyles.info}>
        <Text style={[rowStyles.name, isDuplicate && rowStyles.nameDuplicate]}>{item.name}</Text>
        {isDuplicate && <Text style={rowStyles.duplicateLabel}>Already on list</Text>}
        {!isDuplicate && qtyUnit.length > 0 && <Text style={rowStyles.meta}>{qtyUnit}</Text>}
      </View>
      {item.aisle !== null && !isDuplicate && (
        <Text style={rowStyles.aisle} numberOfLines={1}>
          {item.aisle.name}
        </Text>
      )}
    </Pressable>
  );
}

export function StapleSection({
  group,
  isCollapsed,
  onToggle,
  onItemPress,
  selectionMode = false,
  selectedIds,
  duplicateIds,
  onToggleSelection,
  onLongPressItem,
}: Props) {
  const storeName = group.store?.name ?? 'No store';
  const count = group.items.length;
  const accentColor = group.store?.color ?? '#2563eb';

  function handleItemPress(item: StapleItemWithDetails) {
    if (selectionMode) {
      if (duplicateIds?.has(item.id)) return;
      onToggleSelection?.(item);
    } else {
      onItemPress(item);
    }
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.header, { borderLeftColor: accentColor }]}
        onPress={onToggle}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${storeName}, ${count} items, ${isCollapsed ? 'collapsed' : 'expanded'}`}
      >
        <Text style={[styles.chevron, { color: accentColor }]}>{isCollapsed ? '▶' : '▼'}</Text>
        <Text style={[styles.storeName, { color: accentColor }]}>{storeName}</Text>
        <Text style={[styles.count, { color: accentColor }]}>{count}</Text>
      </TouchableOpacity>

      {!isCollapsed &&
        group.items.map((item) => (
          <StapleRow
            key={item.id}
            item={item}
            onPress={() => handleItemPress(item)}
            selectionMode={selectionMode}
            isSelected={selectedIds?.has(item.id) ?? false}
            isDuplicate={duplicateIds?.has(item.id) ?? false}
            onLongPress={selectionMode && onLongPressItem ? () => onLongPressItem(item) : undefined}
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
    backgroundColor: '#f3f4f6',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    borderLeftWidth: 4,
  },
  chevron: {
    fontSize: 10,
    marginRight: 8,
    width: 12,
  },
  storeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  count: {
    fontSize: 13,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  rowDuplicate: {
    backgroundColor: '#f9fafb',
  },
  checkbox: {
    fontSize: 18,
    color: '#2563eb',
    marginRight: 12,
    width: 22,
  },
  checkboxDisabled: {
    color: '#d1d5db',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    color: '#111827',
  },
  nameDuplicate: {
    color: '#9ca3af',
  },
  meta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  duplicateLabel: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
    marginTop: 2,
  },
  aisle: {
    fontSize: 13,
    color: '#6b7280',
    maxWidth: 120,
  },
});
