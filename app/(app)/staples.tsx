import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';

import { AddStapleSheet } from '@/components/AddStapleSheet';
import { AisleMismatchModal } from '@/components/AisleMismatchModal';
import { StapleSection } from '@/components/StapleSection';
import { StorePickerModal, type CopyTarget } from '@/components/StorePickerModal';
import { useCopyStaplesToList, type AisleMismatch } from '@/hooks/useCopyStaplesToList';
import { useHousehold } from '@/hooks/useHousehold';
import { useStapleItems } from '@/hooks/useStapleItems';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/lib/supabase';
import type { Aisle, StapleGroup, StapleItemWithDetails } from '@/types';

function buildStoreGroups(items: StapleItemWithDetails[], query: string): StapleGroup[] {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? items.filter((i) => i.name.toLowerCase().includes(normalized))
    : items;

  const map = new Map<string, StapleGroup>();

  for (const item of filtered) {
    const key = item.default_store_id ?? '__no_store__';
    if (!map.has(key)) {
      map.set(key, { store: item.store ?? null, items: [] });
    }
    map.get(key)!.items.push(item);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.store === null && b.store === null) return 0;
    if (a.store === null) return 1;
    if (b.store === null) return -1;
    return a.store.sort_order - b.store.sort_order;
  });
}

type PendingCopy = {
  staples: StapleItemWithDetails[];
  targetStoreId: string | null;
  targetStoreName: string;
  aislesByStore: Map<string, Aisle[]>;
};

export default function StaplesScreen() {
  const { householdId } = useHousehold();
  const { items, loading, refetch } = useStapleItems(householdId);
  const { stores } = useStores();
  const { checkDuplicates, findAisleMismatches, copyItems } = useCopyStaplesToList(householdId);

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingStaple, setEditingStaple] = useState<StapleItemWithDetails | null>(null);
  const [addSheetKey, setAddSheetKey] = useState(0);
  const sheetOpenRef = useRef(false);

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [storePickerVisible, setStorePickerVisible] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);

  // Aisle mismatch flow (EC6-1)
  const [mismatches, setMismatches] = useState<AisleMismatch[]>([]);
  const [mismatchModalVisible, setMismatchModalVisible] = useState(false);
  const pendingCopyRef = useRef<PendingCopy | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = useMemo(() => buildStoreGroups(items, searchQuery), [items, searchQuery]);

  // Non-duplicate count of selected items
  const validSelectedCount = useMemo(
    () => [...selectedIds].filter((id) => !duplicateIds.has(id)).length,
    [selectedIds, duplicateIds],
  );

  function showToast(msg: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3000);
  }

  function toggleSection(key: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSearchClose() {
    setSearchVisible(false);
    setSearchQuery('');
  }

  const openAddSheet = useCallback(() => {
    if (sheetOpenRef.current) return;
    sheetOpenRef.current = true;
    setEditingStaple(null);
    setAddSheetKey((k) => k + 1);
    setSheetVisible(true);
  }, []);

  function handleItemPress(item: StapleItemWithDetails) {
    sheetOpenRef.current = true;
    setEditingStaple(item);
    setSheetVisible(true);
  }

  function handleSheetClose() {
    sheetOpenRef.current = false;
    setSheetVisible(false);
    setEditingStaple(null);
  }

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
    setDuplicateIds(new Set());
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setDuplicateIds(new Set());
    setStorePickerVisible(false);
    setCopyLoading(false);
  }

  function toggleItemSelection(item: StapleItemWithDetails) {
    if (duplicateIds.has(item.id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  // EC6-4: long-press → select all in store or select all
  function handleLongPressItem(item: StapleItemWithDetails) {
    const group = groups.find((g) =>
      g.items.some((i) => i.id === item.id),
    );
    const storeName = group?.store?.name ?? 'this group';
    const inStoreIds = group?.items.map((i) => i.id) ?? [];

    Alert.alert(
      'Select items',
      undefined,
      [
        {
          text: `Select all in ${storeName}`,
          onPress: () => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              for (const id of inStoreIds) {
                if (!duplicateIds.has(id)) next.add(id);
              }
              return next;
            });
          },
        },
        {
          text: 'Select all staples',
          onPress: () => {
            setSelectedIds(
              new Set(items.filter((i) => !duplicateIds.has(i.id)).map((i) => i.id)),
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  const executeCopy = useCallback(
    async (
      staples: StapleItemWithDetails[],
      targetStoreId: string | null,
      targetStoreName: string,
      aislesByStore: Map<string, Aisle[]>,
      overrides: Map<string, string>,
      skippedNoStore: number,
    ) => {
      setCopyLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) {
        setCopyLoading(false);
        return;
      }

      const result = await copyItems(staples, targetStoreId, aislesByStore, overrides, userId);
      setCopyLoading(false);

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      exitSelectionMode();

      const totalSkipped = skippedNoStore + result.skippedNoStore;
      let msg = `${result.addedCount} item${result.addedCount !== 1 ? 's' : ''} added to ${targetStoreName}.`;
      if (totalSkipped > 0) {
        msg += ` ${totalSkipped} skipped (no default store).`;
      }
      showToast(msg);
    },
    [copyItems],
  );

  // Called when user taps a store in the dropdown
  const handleStoreSelect = useCallback(
    async (target: CopyTarget) => {
      setStorePickerVisible(false);

      const targetStoreId = target === 'default' ? null : target.id;
      const targetStoreName =
        target === 'default' ? 'your lists' : target.name;

      const selectedStaples = items.filter((i) => selectedIds.has(i.id));
      if (selectedStaples.length === 0) return;

      setCopyLoading(true);

      // Step 1: duplicate check (EC6-2)
      const dupIds = await checkDuplicates(selectedStaples, targetStoreId);

      if (dupIds.size > 0) {
        setDuplicateIds(dupIds);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of dupIds) next.delete(id);
          return next;
        });

        const remaining = selectedStaples.filter((s) => !dupIds.has(s.id));
        if (remaining.length === 0) {
          setCopyLoading(false);
          showToast(
            `All selected items are already on ${target === 'default' ? 'their lists' : target.name}.`,
          );
          return;
        }
      }

      const validStaples = selectedStaples.filter((s) => !dupIds.has(s.id));

      // Step 2: aisle mismatch check (EC6-1)
      const { mismatches: foundMismatches, aislesByStore } = await findAisleMismatches(
        validStaples,
        targetStoreId,
        stores,
      );

      // Items with no default store (for "each item's default" mode)
      const noStoreItems = target === 'default'
        ? validStaples.filter((s) => !s.default_store_id)
        : [];

      if (foundMismatches.length > 0) {
        // Show modal for EC6-1
        pendingCopyRef.current = { staples: validStaples, targetStoreId, targetStoreName, aislesByStore };
        setMismatches(foundMismatches);
        setMismatchModalVisible(true);
        setCopyLoading(false);
        return;
      }

      await executeCopy(validStaples, targetStoreId, targetStoreName, aislesByStore, new Map(), noStoreItems.length);
    },
    [items, selectedIds, checkDuplicates, findAisleMismatches, stores, executeCopy],
  );

  const handleMismatchConfirm = useCallback(
    async (overrides: Map<string, string>, updatedAislesByStore: Map<string, Aisle[]>) => {
      setMismatchModalVisible(false);
      const pending = pendingCopyRef.current;
      if (!pending) return;

      const noStoreItems = pending.targetStoreId === null
        ? pending.staples.filter((s) => !s.default_store_id)
        : [];

      await executeCopy(
        pending.staples,
        pending.targetStoreId,
        pending.targetStoreName,
        updatedAislesByStore,
        overrides,
        noStoreItems.length,
      );
      pendingCopyRef.current = null;
    },
    [executeCopy],
  );

  const headerRight = useMemo(
    () => selectionMode ? undefined : () => (
      <Pressable
        onPress={openAddSheet}
        hitSlop={12}
        accessibilityLabel="Add staple"
        accessibilityRole="button"
      >
        <Text style={styles.headerAddBtn}>＋</Text>
      </Pressable>
    ),
    [selectionMode, openAddSheet],
  );

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
          title: 'Staples',
          headerRight,
        }}
      />

      {toastMsg !== null && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyHeading}>No staples yet.</Text>
          <Text style={styles.emptySub}>
            Add your household's go-to items so you can quickly restock them.
          </Text>
          <Pressable
            style={styles.emptyAddBtn}
            onPress={openAddSheet}
            accessibilityLabel="Add a staple"
            accessibilityRole="button"
          >
            <Text style={styles.emptyAddBtnLabel}>+ Add a Staple</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.screen}>
          {/* Toolbar */}
          {selectionMode ? (
            <View style={styles.toolbar}>
              <Pressable onPress={exitSelectionMode} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel selection">
                <Text style={styles.toolbarCancel}>✕ Cancel</Text>
              </Pressable>
              <Text style={styles.toolbarCount}>
                {validSelectedCount} selected
              </Text>
              <Pressable
                onPress={() => {
                  if (validSelectedCount === 0) return;
                  setStorePickerVisible(true);
                }}
                disabled={validSelectedCount === 0 || copyLoading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Add to list"
                accessibilityState={{ disabled: validSelectedCount === 0 || copyLoading }}
              >
                {copyLoading ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Text style={[styles.toolbarAddBtn, validSelectedCount === 0 && styles.toolbarAddBtnDisabled]}>
                    Add to List ▾
                  </Text>
                )}
              </Pressable>
            </View>
          ) : searchVisible ? (
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                autoFocus
                placeholder="Search staples…"
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel="Search staples"
              />
              <Pressable onPress={handleSearchClose} hitSlop={8}>
                <Text style={styles.searchCancel}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.toolbar}>
              <Pressable
                onPress={enterSelectionMode}
                hitSlop={8}
                accessibilityLabel="Select staples"
                accessibilityRole="button"
              >
                <Text style={styles.toolbarSelectBtn}>Select</Text>
              </Pressable>
              <View style={styles.toolbarRight}>
                <Pressable
                  onPress={openAddSheet}
                  hitSlop={8}
                  accessibilityLabel="Add staple"
                  accessibilityRole="button"
                >
                  <Text style={styles.toolbarAddStapleBtn}>＋ Add</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSearchVisible(true)}
                  hitSlop={8}
                  accessibilityLabel="Search staples"
                  accessibilityRole="button"
                >
                  <Text style={styles.toolbarSearchBtn}>🔍</Text>
                </Pressable>
              </View>
            </View>
          )}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {groups.map((group) => {
              const key = group.store?.id ?? '__no_store__';
              return (
                <StapleSection
                  key={key}
                  group={group}
                  isCollapsed={!searchVisible && !selectionMode && collapsedKeys.has(key)}
                  onToggle={() => toggleSection(key)}
                  onItemPress={handleItemPress}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  duplicateIds={duplicateIds}
                  onToggleSelection={toggleItemSelection}
                  onLongPressItem={handleLongPressItem}
                />
              );
            })}

            {groups.length === 0 && searchQuery.trim().length > 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  No staples match "{searchQuery.trim()}".
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {householdId !== null && !selectionMode && (
        <AddStapleSheet
          key={editingStaple?.id ?? `add-${addSheetKey}`}
          visible={sheetVisible}
          onClose={handleSheetClose}
          householdId={householdId}
          allStores={stores}
          stapleToEdit={editingStaple}
          onSaved={refetch}
        />
      )}

      <StorePickerModal
        visible={storePickerVisible}
        stores={stores}
        selectedCount={validSelectedCount}
        onSelect={handleStoreSelect}
        onClose={() => setStorePickerVisible(false)}
      />

      {householdId !== null && (
        <AisleMismatchModal
          visible={mismatchModalVisible}
          mismatches={mismatches}
          householdId={householdId}
          onConfirm={handleMismatchConfirm}
          onClose={() => setMismatchModalVisible(false)}
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
  emptyHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyAddBtnLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerAddBtn: { fontSize: 22, color: '#2563eb', fontWeight: '400', marginRight: 4 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  toolbarSelectBtn: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 16, marginLeft: 'auto' },
  toolbarAddStapleBtn: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  toolbarSearchBtn: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  toolbarCancel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  toolbarCount: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#111827' },
  toolbarAddBtn: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  toolbarAddBtnDisabled: { color: '#d1d5db' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  searchCancel: { fontSize: 15, color: '#2563eb' },
  noResults: { padding: 32, alignItems: 'center' },
  noResultsText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  toast: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 100,
    alignItems: 'center',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
