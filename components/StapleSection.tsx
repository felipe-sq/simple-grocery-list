import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { StapleGroup, StapleItemWithDetails } from '@/types';

type Props = {
  group: StapleGroup;
  isCollapsed: boolean;
  onToggle: () => void;
};

function StapleRow({ item }: { item: StapleItemWithDetails }) {
  const qtyUnit = [
    item.default_qty !== null ? String(item.default_qty) : null,
    item.default_unit ?? null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{item.name}</Text>
        {qtyUnit.length > 0 && <Text style={rowStyles.meta}>{qtyUnit}</Text>}
      </View>
      {item.aisle !== null && (
        <Text style={rowStyles.aisle} numberOfLines={1}>
          {item.aisle.name}
        </Text>
      )}
    </View>
  );
}

export function StapleSection({ group, isCollapsed, onToggle }: Props) {
  const storeName = group.store?.name ?? 'No store';
  const count = group.items.length;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.header}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${storeName}, ${count} items, ${isCollapsed ? 'collapsed' : 'expanded'}`}
      >
        <Text style={styles.chevron}>{isCollapsed ? '▶' : '▼'}</Text>
        <Text style={styles.storeName}>{storeName}</Text>
        <Text style={styles.count}>{count}</Text>
      </Pressable>

      {!isCollapsed &&
        group.items.map((item) => <StapleRow key={item.id} item={item} />)}
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
  storeName: {
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
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    color: '#111827',
  },
  meta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  aisle: {
    fontSize: 13,
    color: '#6b7280',
    maxWidth: 120,
  },
});
