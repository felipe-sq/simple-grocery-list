import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { VoiceItemCard, type ReviewItemState } from '@/components/VoiceItemCard';
import { useAisles } from '@/hooks/useAisles';
import { supabase } from '@/lib/supabase';
import type { AddItemInput, ParsedVoiceItem, Store } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  store: Store;
  householdId: string;
  items: ParsedVoiceItem[];
  addItem: (data: AddItemInput) => Promise<{ error: string | null }>;
};

export function VoiceReviewSheet({
  visible,
  onClose,
  store,
  householdId,
  items,
  addItem,
}: Props) {
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);
  const { aisles, createAisle } = useAisles(store.id, householdId);

  const [reviewItems, setReviewItems] = useState<ReviewItemState[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Prevents the history lookup from re-running after aisles change (e.g. user creates new aisle)
  const lookupDoneRef = useRef(false);

  // Reset state each time a new session opens
  useEffect(() => {
    if (!visible) {
      lookupDoneRef.current = false;
      return;
    }
    const ts = Date.now();
    const initial: ReviewItemState[] = items.map((item, idx) => ({
      key: `${ts}-${idx}`,
      name: item.name,
      aisleId: null,
      aisle: null,
      qty: String(item.qty),
      unit: item.unit ?? '',
      checked: true,
      parsed: item.parsed,
      error: null,
    }));
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setReviewItems(initial);
      setSubmitting(false);
    });
    return () => {
      active = false;
    };
  }, [visible, items]);

  // Look up aisles from item_history once per session, after aisles are available
  useEffect(() => {
    if (!visible || lookupDoneRef.current || aisles.length === 0 || items.length === 0) return;
    lookupDoneRef.current = true;

    let cancelled = false;

    async function doLookup() {
      const results = await Promise.all(
        items.map(async (item) => {
          const { data } = await supabase
            .from('item_history')
            .select('aisle_id')
            .eq('household_id', householdId)
            .ilike('name', item.name.trim())
            .order('purchased_at', { ascending: false })
            .limit(1);
          const row = (data as { aisle_id: string }[] | null)?.[0];
          return { name: item.name, aisleId: row?.aisle_id ?? null };
        }),
      );

      if (cancelled) return;

      setReviewItems((prev) =>
        prev.map((r) => {
          const match = results.find(
            (res) => res.name.toLowerCase() === r.name.toLowerCase(),
          );
          if (!match?.aisleId) return r;
          const found = aisles.find((a) => a.id === match.aisleId);
          if (!found) return r; // aisle belongs to a different store
          return {
            ...r,
            aisleId: found.id,
            aisle: { id: found.id, name: found.name, sort_order: found.sort_order },
          };
        }),
      );
    }

    doLookup();
    return () => {
      cancelled = true;
    };
  }, [visible, aisles, items, householdId]);

  useEffect(() => {
    if (visible) {
      modalRef.current?.present();
    } else {
      modalRef.current?.dismiss();
    }
  }, [visible]);

  function handleUpdate(key: string, update: Partial<ReviewItemState>) {
    setReviewItems((prev) => prev.map((r) => (r.key === key ? { ...r, ...update } : r)));
  }

  const checkedItems = reviewItems.filter((r) => r.checked);
  const hasUnknownAisle = checkedItems.some((r) => r.aisleId === null);
  const btnDisabled = submitting || hasUnknownAisle || checkedItems.length === 0;
  const btnLabel =
    checkedItems.length === reviewItems.length
      ? `Add All (${checkedItems.length})`
      : `Add Selected (${checkedItems.length})`;

  async function handleAdd() {
    if (btnDisabled) return;
    setSubmitting(true);

    let anyError = false;

    for (const r of checkedItems) {
      if (!r.aisleId || !r.aisle) continue;

      // EC2-5: check for duplicate before writing
      const { data: dupes } = await supabase
        .from('grocery_items')
        .select('id')
        .eq('household_id', householdId)
        .eq('store_id', store.id)
        .eq('checked', false)
        .ilike('name', r.name.trim())
        .limit(1);

      if (dupes && dupes.length > 0) {
        const msg = `${r.name} is already on your ${store.name} list.`;
        setReviewItems((prev) =>
          prev.map((item) => (item.key === r.key ? { ...item, error: msg } : item)),
        );
        anyError = true;
        continue;
      }

      const result = await addItem({
        name: r.name.trim(),
        storeId: store.id,
        aisleId: r.aisleId,
        aisle: r.aisle,
        quantity: r.qty ? parseFloat(r.qty) : null,
        unit: r.unit.trim() || null,
        notes: null,
        source: 'voice',
      });

      if (result.error) {
        const errMsg = result.error;
        setReviewItems((prev) =>
          prev.map((item) => (item.key === r.key ? { ...item, error: errMsg } : item)),
        );
        anyError = true;
      } else {
        setReviewItems((prev) => prev.filter((item) => item.key !== r.key));
      }
    }

    setSubmitting(false);
    if (!anyError) onClose();
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="none" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onDismiss={onClose}
      enablePanDownToClose={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Review Items</Text>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close review"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        We heard {items.length} item{items.length !== 1 ? 's' : ''}. Review before adding:
      </Text>

      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {reviewItems.map((item) => (
          <VoiceItemCard
            key={item.key}
            item={item}
            storeName={store.name}
            aisles={aisles}
            onUpdate={handleUpdate}
            onCreateAisle={createAisle}
          />
        ))}
      </BottomSheetScrollView>

      <View style={styles.footer}>
        {hasUnknownAisle && checkedItems.length > 0 && (
          <Text style={styles.blockNote}>Assign all aisles before adding.</Text>
        )}
        <View style={styles.footerRow}>
          <Pressable
            style={[styles.addBtn, btnDisabled && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={btnDisabled}
            accessibilityRole="button"
            accessibilityLabel={submitting ? 'Adding items' : btnLabel}
            accessibilityState={{ disabled: btnDisabled }}
          >
            <Text style={styles.addBtnText}>{submitting ? 'Adding…' : btnLabel}</Text>
          </Pressable>
          <Pressable
            style={styles.cancelBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel and discard"
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  closeIcon: { fontSize: 18, color: '#6b7280' },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  scrollContent: { paddingBottom: 16 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  blockNote: { fontSize: 13, color: '#d97706', textAlign: 'center', marginBottom: 8 },
  footerRow: { flexDirection: 'row', gap: 10 },
  addBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#93c5fd' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#6b7280', fontSize: 15 },
});
