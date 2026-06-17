import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';

import { AddItemSheet } from '@/components/AddItemSheet';
import { AisleSection } from '@/components/AisleSection';
import { EditItemSheet } from '@/components/EditItemSheet';
import { ItemContextMenu } from '@/components/ItemContextMenu';
import { MoveAisleSheet } from '@/components/MoveAisleSheet';
import { useGroceryItems } from '@/hooks/useGroceryItems';
import { useHousehold } from '@/hooks/useHousehold';
import { useStores } from '@/hooks/useStores';
import type { AisleGroup, GroceryItemWithAisle } from '@/types';

function buildAisleGroups(items: GroceryItemWithAisle[]): AisleGroup[] {
  const map = new Map<string, AisleGroup>();

  for (const item of items) {
    if (!map.has(item.aisle_id)) {
      map.set(item.aisle_id, { aisle: item.aisle, items: [] });
    }
    map.get(item.aisle_id)!.items.push(item);
  }

  const groups = Array.from(map.values()).sort(
    (a, b) => a.aisle.sort_order - b.aisle.sort_order,
  );

  for (const group of groups) {
    const unchecked = group.items
      .filter((i) => !i.checked)
      .sort((a, b) => a.sort_order - b.sort_order);
    const checked = group.items
      .filter((i) => i.checked)
      .sort((a, b) => {
        if (!a.checked_at) return 1;
        if (!b.checked_at) return -1;
        return a.checked_at.localeCompare(b.checked_at);
      });
    group.items = [...unchecked, ...checked];
  }

  return groups;
}

export default function StoreScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { householdId } = useHousehold();
  const { stores } = useStores();
  const { items, loading, toggleItem, addItem, editItem, deleteItem, moveItemToAisle } = useGroceryItems(storeId, householdId);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [contextMenuItem, setContextMenuItem] = useState<GroceryItemWithAisle | null>(null);
  const [editingItem, setEditingItem] = useState<GroceryItemWithAisle | null>(null);
  const [movingItem, setMovingItem] = useState<GroceryItemWithAisle | null>(null);

  const aisleGroups = useMemo(() => buildAisleGroups(items), [items]);

  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fullyCheckedIds = new Set(
      aisleGroups
        .filter((g) => g.items.length > 0 && g.items.every((i) => i.checked))
        .map((g) => g.aisle.id),
    );
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setManuallyExpanded((prev) => {
        const next = new Set(prev);
        for (const id of next) {
          if (!fullyCheckedIds.has(id)) next.delete(id);
        }
        return next;
      });
    });
    return () => { active = false; };
  }, [aisleGroups]);

  const insets = useSafeAreaInsets();

  const currentStore = stores.find((s) => s.id === storeId);
  const allChecked = items.length > 0 && items.every((i) => i.checked);

  function isCollapsed(group: AisleGroup): boolean {
    const fullyChecked = group.items.length > 0 && group.items.every((i) => i.checked);
    return fullyChecked && !manuallyExpanded.has(group.aisle.id);
  }

  function handleLongPressItem(item: GroceryItemWithAisle) {
    setContextMenuItem(item);
  }

  function handleContextEdit() {
    const item = contextMenuItem;
    setContextMenuItem(null);
    setEditingItem(item);
  }

  function handleContextMoveAisle() {
    const item = contextMenuItem;
    setContextMenuItem(null);
    setMovingItem(item);
  }

  function handleToggle(group: AisleGroup) {
    setManuallyExpanded((prev) => {
      const next = new Set(prev);
      if (isCollapsed(group)) {
        next.add(group.aisle.id);
      } else {
        next.delete(group.aisle.id);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: currentStore?.name ?? '',
          headerRight: () => (
            <Pressable
              onPress={() => setSheetVisible(true)}
              hitSlop={12}
              accessibilityLabel="Add item"
              accessibilityRole="button"
            >
              <Text style={styles.addBtn}>＋</Text>
            </Pressable>
          ),
        }}
      />

      {items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyHeading}>Your list is empty.</Text>
          <Text style={styles.emptySub}>Add items to get started.</Text>
        </View>
      ) : (
        <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {aisleGroups.map((group) => (
              <AisleSection
                key={group.aisle.id}
                group={group}
                isCollapsed={isCollapsed(group)}
                onToggle={() => handleToggle(group)}
                onToggleItem={toggleItem}
                onLongPressItem={handleLongPressItem}
              />
            ))}

            {allChecked && (
              <View style={styles.allCheckedBanner}>
                <Text style={styles.allCheckedText}>Everything's in the cart 🛒</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={[styles.endTripBtn, allChecked && styles.endTripBtnPulse]}>
              <Text style={styles.endTripLabel}>End Trip</Text>
            </View>
          </View>
        </View>
      )}

      {currentStore !== undefined && householdId !== null && (
        <AddItemSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          store={currentStore}
          allStores={stores}
          householdId={householdId}
          onSubmit={addItem}
        />
      )}

      {contextMenuItem !== null && (
        <ItemContextMenu
          item={contextMenuItem}
          onEdit={handleContextEdit}
          onMoveAisle={handleContextMoveAisle}
          onDelete={() => deleteItem(contextMenuItem.id)}
          onClose={() => setContextMenuItem(null)}
        />
      )}

      {householdId !== null && (
        <EditItemSheet
          key={editingItem?.id ?? 'none'}
          item={editingItem}
          allStores={stores}
          householdId={householdId}
          onSubmit={editItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {householdId !== null && (
        <MoveAisleSheet
          item={movingItem}
          householdId={householdId}
          onMove={(aisle) => {
            if (movingItem) moveItemToAisle(movingItem.id, aisle);
          }}
          onClose={() => setMovingItem(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 8 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyHeading: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  allCheckedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    alignItems: 'center',
  },
  allCheckedText: { fontSize: 16, fontWeight: '600', color: '#1d4ed8' },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  endTripBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endTripBtnPulse: { backgroundColor: '#1d4ed8' },
  endTripLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  addBtn: { fontSize: 22, color: '#2563eb', fontWeight: '400', marginRight: 4 },
});
