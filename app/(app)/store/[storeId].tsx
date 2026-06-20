import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';

import { AddItemSheet, type AddItemSheetHandle } from '@/components/AddItemSheet';
import { AisleSection } from '@/components/AisleSection';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { EditItemSheet } from '@/components/EditItemSheet';
import { EndTripModal } from '@/components/EndTripModal';
import { ItemContextMenu } from '@/components/ItemContextMenu';
import { ListeningOverlay } from '@/components/ListeningOverlay';
import { MoveAisleSheet } from '@/components/MoveAisleSheet';
import { VoiceReviewSheet } from '@/components/VoiceReviewSheet';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useGroceryItems } from '@/hooks/useGroceryItems';
import { useHousehold } from '@/hooks/useHousehold';
import { useStores } from '@/hooks/useStores';
import { parseVoiceInput } from '@/lib/parseVoiceInput';
import type { AisleGroup, BarcodePrefill, GroceryItemWithAisle, ParsedVoiceItem } from '@/types';

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
  const { items, loading, toggleItem, addItem, editItem, deleteItem, moveItemToAisle, reorderItems, endTrip } = useGroceryItems(storeId, householdId);
  const { lookupBarcode } = useBarcodeScanner(householdId);

  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetOpenRef = useRef(false);
  const [endTripModalVisible, setEndTripModalVisible] = useState(false);
  const [contextMenuItem, setContextMenuItem] = useState<GroceryItemWithAisle | null>(null);
  const [editingItem, setEditingItem] = useState<GroceryItemWithAisle | null>(null);
  const [movingItem, setMovingItem] = useState<GroceryItemWithAisle | null>(null);

  // Barcode scanner state
  const [scannerVisible, setScannerVisible] = useState(false);
  // 'header' = scanner opened from header 📷; 'sheet' = opened from inside AddItemSheet (EC3-7)
  const [scanMode, setScanMode] = useState<'header' | 'sheet'>('header');
  const [barcodePrefill, setBarcodePrefill] = useState<BarcodePrefill | null>(null);
  const addItemSheetRef = useRef<AddItemSheetHandle>(null);

  // Voice input state
  const [voiceOverlayVisible, setVoiceOverlayVisible] = useState(false);
  const [parsedVoiceItems, setParsedVoiceItems] = useState<ParsedVoiceItem[]>([]);
  const [voiceReviewVisible, setVoiceReviewVisible] = useState(false);

  const aisleGroups = useMemo(() => buildAisleGroups(items), [items]);

  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fullyCheckedIds = new Set(
      aisleGroups
        .filter((g) => g.items.length > 0 && g.items.every((i) => i.checked))
        .map((g) => g.aisle.id),
    );
    const allAisleIds = new Set(aisleGroups.map((g) => g.aisle.id));
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
      setManuallyCollapsed((prev) => {
        const next = new Set(prev);
        for (const id of next) {
          if (!allAisleIds.has(id)) next.delete(id);
        }
        return next;
      });
    });
    return () => { active = false; };
  }, [aisleGroups]);

  const insets = useSafeAreaInsets();

  const currentStore = stores.find((s) => s.id === storeId);
  const allChecked = items.length > 0 && items.every((i) => i.checked);
  const hasChecked = items.some((i) => i.checked);

  function handleEndTripPress() {
    if (!hasChecked) {
      // EC5-1: no checked items — show notice instead of modal
      Alert.alert(
        'Nothing checked off yet',
        "Nothing's been checked off yet. Check off items as you shop, then end your trip.",
        [{ text: 'OK' }],
      );
      return;
    }
    setEndTripModalVisible(true);
  }

  function isCollapsed(group: AisleGroup): boolean {
    if (manuallyExpanded.has(group.aisle.id)) return false;
    if (manuallyCollapsed.has(group.aisle.id)) return true;
    return group.items.length > 0 && group.items.every((i) => i.checked);
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
    const id = group.aisle.id;
    const collapsed = isCollapsed(group);
    setManuallyExpanded((prev) => {
      const next = new Set(prev);
      if (collapsed) { next.add(id); } else { next.delete(id); }
      return next;
    });
    setManuallyCollapsed((prev) => {
      const next = new Set(prev);
      if (!collapsed) { next.add(id); } else { next.delete(id); }
      return next;
    });
  }

  const openAddSheet = useCallback(() => {
    if (sheetOpenRef.current) return;
    sheetOpenRef.current = true;
    setSheetVisible(true);
  }, []);

  const closeAddSheet = useCallback(() => {
    sheetOpenRef.current = false;
    setSheetVisible(false);
    setBarcodePrefill(null);
  }, []);

  // Opened from header 📷
  function handleHeaderScanPress() {
    setScanMode('header');
    setScannerVisible(true);
  }

  // EC3-7: opened from inside AddItemSheet
  function handleSheetScanRequest() {
    setScanMode('sheet');
    setScannerVisible(true);
  }

  async function handleBarcodeScan(barcode: string) {
    setScannerVisible(false);

    const result = await lookupBarcode(barcode);

    if (scanMode === 'header') {
      // Open AddItemSheet pre-filled (EC3-1, EC3-2, EC3-5 notices shown inside sheet)
      setBarcodePrefill(result);
      sheetOpenRef.current = true;
      setSheetVisible(true);
    } else {
      // EC3-7: sheet is already open — fill only the name, keep store/aisle as-is
      addItemSheetRef.current?.setNameFromBarcode(
        result.name,
        result.barcode,
        result.offline,
      );
    }
  }

  function handleVoiceTranscribed(transcript: string) {
    setVoiceOverlayVisible(false);
    setParsedVoiceItems(parseVoiceInput(transcript));
    setVoiceReviewVisible(true);
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
            <View style={styles.headerButtons}>
              <Pressable
                onPress={handleHeaderScanPress}
                hitSlop={12}
                accessibilityLabel="Scan barcode"
                accessibilityRole="button"
              >
                <Text style={styles.headerIconBtn}>📷</Text>
              </Pressable>
              <Pressable
                onPress={() => setVoiceOverlayVisible(true)}
                hitSlop={12}
                accessibilityLabel="Voice input"
                accessibilityRole="button"
              >
                <Text style={styles.headerIconBtn}>🎤</Text>
              </Pressable>
              <Pressable
                onPress={openAddSheet}
                hitSlop={12}
                accessibilityLabel="Add item"
                accessibilityRole="button"
              >
                <Text style={styles.addBtn}>＋</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {/* EC5-2: button hidden when no items — empty state shown instead */}
      {items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyHeading}>
            Your {currentStore?.name ?? ''} list is empty.
          </Text>
          <Text style={styles.emptySub}>Add items to get started.</Text>
          {currentStore !== undefined && householdId !== null && (
            <Pressable
              style={styles.emptyAddBtn}
              onPress={openAddSheet}
              accessibilityLabel="Add item"
              accessibilityRole="button"
            >
              <Text style={styles.emptyAddBtnLabel}>+ Add Item</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
          {(() => {
            const listContent = (
              <>
                {aisleGroups.map((group) => (
                  <AisleSection
                    key={group.aisle.id}
                    group={group}
                    isCollapsed={isCollapsed(group)}
                    onToggle={() => handleToggle(group)}
                    onToggleItem={toggleItem}
                    onLongPressItem={handleLongPressItem}
                    onReorderItems={reorderItems}
                  />
                ))}
                {allChecked && (
                  <View style={styles.allCheckedBanner}>
                    <Text style={styles.allCheckedText}>Everything's in the cart 🛒</Text>
                  </View>
                )}
              </>
            );
            return Platform.OS === 'web' ? (
              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {listContent}
              </ScrollView>
            ) : (
              <NestableScrollContainer style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {listContent}
              </NestableScrollContainer>
            );
          })()}

          <View style={styles.footer}>
            <Pressable
              style={styles.footerAddBtn}
              onPress={openAddSheet}
              accessibilityLabel="Add item"
              accessibilityRole="button"
            >
              <Text style={styles.footerAddBtnLabel}>＋</Text>
            </Pressable>
            <Pressable
              style={[styles.endTripBtn, allChecked && styles.endTripBtnPulse]}
              onPress={handleEndTripPress}
              accessibilityLabel="End trip"
              accessibilityRole="button"
            >
              <Text style={styles.endTripLabel}>End Trip</Text>
            </Pressable>
          </View>
        </View>
      )}

      {currentStore !== undefined && householdId !== null && (
        <AddItemSheet
          ref={addItemSheetRef}
          visible={sheetVisible}
          onClose={closeAddSheet}
          store={currentStore}
          allStores={stores}
          householdId={householdId}
          onSubmit={addItem}
          barcodePrefill={barcodePrefill}
          onRequestBarcodeScanner={handleSheetScanRequest}
        />
      )}

      <BarcodeScanner
        visible={scannerVisible}
        onScan={handleBarcodeScan}
        onCancel={() => setScannerVisible(false)}
      />

      <ListeningOverlay
        visible={voiceOverlayVisible}
        onTranscribed={handleVoiceTranscribed}
        onCancel={() => setVoiceOverlayVisible(false)}
        onTypeInstead={() => {
          setVoiceOverlayVisible(false);
          setSheetVisible(true);
        }}
      />

      {currentStore !== undefined && householdId !== null && (
        <VoiceReviewSheet
          visible={voiceReviewVisible}
          onClose={() => setVoiceReviewVisible(false)}
          store={currentStore}
          householdId={householdId}
          items={parsedVoiceItems}
          addItem={addItem}
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

      <EndTripModal
        visible={endTripModalVisible}
        storeName={currentStore?.name ?? ''}
        items={items}
        onConfirm={endTrip}
        onClose={() => setEndTripModalVisible(false)}
      />
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
  emptyHeading: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  emptyAddBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyAddBtnLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  footerAddBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerAddBtnLabel: { color: '#2563eb', fontSize: 22, fontWeight: '400' },
  endTripBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endTripBtnPulse: { backgroundColor: '#1d4ed8' },
  endTripLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBtn: { fontSize: 20 },
  addBtn: { fontSize: 22, color: '#2563eb', fontWeight: '400', marginRight: 4 },
});
