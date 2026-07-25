import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import { getTagColor } from '@/components/TagPill';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { GroceryItem } from '@/types';

type FlatEntry =
  | { type: 'section_header'; title: string; color: string; key: string }
  | { type: 'item'; item: GroceryItem; key: string }
  | { type: 'completed_toggle'; count: number; key: string };

interface Props {
  items: GroceryItem[];
  selectedTag: string | null;
  onToggle: (item: GroceryItem) => void;
  onDelete: (item: GroceryItem) => void;
  onTagPress: (tag: string) => void;
  onClearCompleted: () => void;
}

export function ListItemsView({ items, selectedTag, onToggle, onDelete, onTagPress, onClearCompleted }: Props) {
  const colors = useThemeColors();
  const [showCompleted, setShowCompleted] = useState(false);

  const styles = useThemedStyles((c) => ({
    listContent: { paddingBottom: 24 },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 6,
      backgroundColor: c.background,
    },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionTitle: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.3 },
    completedToggle: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    completedToggleLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    completedLabel: { fontSize: 14, fontWeight: '600' as const, color: c.mutedForeground },
    clearBtnText: { fontSize: 14, fontWeight: '600' as const, color: c.destructive },
    empty: { alignItems: 'center' as const, paddingTop: 60, gap: 8 },
    emptyText: { fontSize: 15, color: c.mutedForeground },
  }));

  const flatData = useMemo((): FlatEntry[] => {
    const pending = items.filter((i) => !i.checked);
    const completed = items.filter((i) => i.checked);
    const filtered = selectedTag ? pending.filter((i) => i.tag === selectedTag) : pending;

    const groups = new Map<string, GroceryItem[]>();
    const noTag: GroceryItem[] = [];
    filtered.forEach((item) => {
      if (!item.tag) {
        noTag.push(item);
      } else {
        const group = groups.get(item.tag) ?? [];
        group.push(item);
        groups.set(item.tag, group);
      }
    });

    const result: FlatEntry[] = [];

    if (!selectedTag) {
      noTag.forEach((item) => result.push({ type: 'item', item, key: item.id }));
    }

    [...groups.keys()].sort().forEach((tag) => {
      result.push({ type: 'section_header', title: tag, color: getTagColor(tag), key: `header_${tag}` });
      groups.get(tag)?.forEach((item) => result.push({ type: 'item', item, key: item.id }));
    });

    const visibleCompleted = selectedTag ? completed.filter((i) => i.tag === selectedTag) : completed;
    if (visibleCompleted.length > 0) {
      result.push({ type: 'completed_toggle', count: visibleCompleted.length, key: 'completed_toggle' });
      if (showCompleted) {
        visibleCompleted.forEach((item) => result.push({ type: 'item', item, key: `completed_${item.id}` }));
      }
    }

    return result;
  }, [items, selectedTag, showCompleted]);

  function renderEntry({ item: entry }: { item: FlatEntry }) {
    if (entry.type === 'section_header') {
      return (
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: entry.color }]} />
          <Text style={[styles.sectionTitle, { color: entry.color }]}>{entry.title}</Text>
        </View>
      );
    }

    if (entry.type === 'completed_toggle') {
      return (
        <View style={styles.completedToggle}>
          <TouchableOpacity
            style={styles.completedToggleLeft}
            onPress={() => setShowCompleted((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${showCompleted ? 'Collapse' : 'Expand'} completed items`}
          >
            <Ionicons
              name={showCompleted ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={styles.completedLabel}>Completed ({entry.count})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClearCompleted}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear all completed items"
          >
            <Text style={styles.clearBtnText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ItemRow
        item={entry.item}
        onToggle={() => onToggle(entry.item)}
        onDelete={() => onDelete(entry.item)}
        onTagPress={entry.item.tag ? () => onTagPress(entry.item.tag as string) : undefined}
      />
    );
  }

  return (
    <FlatList
      data={flatData}
      keyExtractor={(entry) => entry.key}
      renderItem={renderEntry}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={36} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>No items yet — add one below</Text>
        </View>
      }
    />
  );
}
