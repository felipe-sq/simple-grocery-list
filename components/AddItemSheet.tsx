import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

import { AislePicker } from '@/components/AislePicker';
import { SuggestionsDropdown } from '@/components/SuggestionsDropdown';
import { useAisles } from '@/hooks/useAisles';
import { useItemSuggestions } from '@/hooks/useItemSuggestions';
import { supabase } from '@/lib/supabase';
import type { AddItemInput, Aisle, Store, SuggestionResult } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  store: Store;
  allStores: Store[];
  householdId: string;
  onSubmit: (data: AddItemInput) => Promise<{ error: string | null }>;
};

export function AddItemSheet({ visible, onClose, store, allStores, householdId, onSubmit }: Props) {
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const [name, setName] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState(store.id);
  const [selectedAisle, setSelectedAisle] = useState<Pick<Aisle, 'id' | 'name' | 'sort_order'> | null>(null);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  const { aisles, createAisle } = useAisles(selectedStoreId, householdId);
  const { suggestions } = useItemSuggestions(name, householdId);

  useEffect(() => {
    if (visible) {
      modalRef.current?.present();
    } else {
      modalRef.current?.dismiss();
    }
  }, [visible]);

  const isDirty =
    name.trim() !== '' || selectedAisle !== null || qty !== '' || unit !== '' || notes.trim() !== '';
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  const resetForm = useCallback(() => {
    setName('');
    setSelectedStoreId(store.id);
    setSelectedAisle(null);
    setQty('');
    setUnit('');
    setNotes('');
    setNameError(null);
    setSubmitError(null);
    setStoreOpen(false);
  }, [store.id]);

  // EC1-7: confirm discard if form has content
  const handleClose = useCallback(() => {
    if (isDirtyRef.current) {
      Alert.alert('Discard this item?', undefined, [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => { resetForm(); onClose(); },
        },
      ]);
    } else {
      onClose();
    }
  }, [onClose, resetForm]);

  function handleSuggestionSelect(s: SuggestionResult) {
    setName(s.name);
    setSelectedStoreId(s.store_id);
    setSelectedAisle({ id: s.aisle_id, name: s.aisle_name, sort_order: 0 });
    setNameError(null);
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (!name.trim() || !selectedAisle) return;
    setSubmitting(true);
    setNameError(null);
    setSubmitError(null);

    // EC1-3: duplicate hard-block — UI check before DB write
    const { data: dupeRows } = await supabase
      .from('grocery_items')
      .select('id')
      .eq('household_id', householdId)
      .eq('store_id', selectedStoreId)
      .eq('checked', false)
      .ilike('name', name.trim())
      .limit(1);

    if (dupeRows && dupeRows.length > 0) {
      const storeName = allStores.find((s) => s.id === selectedStoreId)?.name ?? 'this store';
      setNameError(`${name.trim()} is already on your ${storeName} list.`);
      setSubmitting(false);
      return;
    }

    const result = await onSubmit({
      name: name.trim(),
      storeId: selectedStoreId,
      aisleId: selectedAisle.id,
      aisle: selectedAisle,
      quantity: qty ? parseFloat(qty) : null,
      unit: unit.trim() || null,
      notes: notes.trim() || null,
    });

    setSubmitting(false);
    if (result.error) {
      setSubmitError(result.error);
    } else {
      resetForm();
      onClose();
    }
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="none" />
    ),
    [],
  );

  const selectedStoreName = allStores.find((s) => s.id === selectedStoreId)?.name ?? '';
  const canSubmit = name.trim().length > 0 && selectedAisle !== null;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onDismiss={onClose}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Add Item</Text>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Item name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Oat milk"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={(t) => { setName(t); setNameError(null); setSubmitError(null); }}
          returnKeyType="next"
        />
        {nameError !== null && <Text style={styles.errorText}>{nameError}</Text>}
        <SuggestionsDropdown suggestions={suggestions} onSelect={handleSuggestionSelect} />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Store</Text>
            <Pressable style={styles.picker} onPress={() => setStoreOpen((v) => !v)}>
              <Text style={styles.pickerText} numberOfLines={1}>{selectedStoreName}</Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>
            {storeOpen && (
              <View style={styles.storeDropdown}>
                {allStores.map((s) => (
                  <Pressable
                    key={s.id}
                    style={[styles.storeOption, s.id === selectedStoreId && styles.storeOptionActive]}
                    onPress={() => { setSelectedStoreId(s.id); setSelectedAisle(null); setNameError(null); setStoreOpen(false); }}
                  >
                    <Text style={[styles.storeOptionText, s.id === selectedStoreId && styles.storeOptionTextActive]}>
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.halfField}>
            <Text style={styles.label}>Aisle</Text>
            <AislePicker
              aisles={aisles}
              selectedAisleId={selectedAisle?.id ?? null}
              onSelect={(aisle) => setSelectedAisle({ id: aisle.id, name: aisle.name, sort_order: aisle.sort_order })}
              onCreateAisle={createAisle}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.qtyField}>
            <Text style={styles.label}>Qty</Text>
            <TextInput
              style={styles.input}
              placeholder="—"
              placeholderTextColor="#9ca3af"
              value={qty}
              onChangeText={setQty}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>
          <View style={styles.unitField}>
            <Text style={styles.label}>Unit</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. lbs, cans"
              placeholderTextColor="#9ca3af"
              value={unit}
              onChangeText={setUnit}
              returnKeyType="next"
            />
          </View>
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholderTextColor="#9ca3af"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {submitError !== null && <Text style={styles.errorText}>{submitError}</Text>}

        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          <Text style={styles.submitLabel}>{submitting ? 'Adding…' : 'Add Item'}</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 17, fontWeight: '600', color: '#111827' },
  closeBtn: { padding: 4 },
  closeIcon: { fontSize: 18, color: '#6b7280' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  qtyField: { flex: 1 },
  unitField: { flex: 2 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  pickerText: { flex: 1, fontSize: 15, color: '#111827' },
  chevron: { fontSize: 12, color: '#6b7280' },
  storeDropdown: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 2,
    overflow: 'hidden',
  },
  storeOption: { paddingVertical: 11, paddingHorizontal: 12 },
  storeOptionActive: { backgroundColor: '#eff6ff' },
  storeOptionText: { fontSize: 15, color: '#111827' },
  storeOptionTextActive: { color: '#2563eb', fontWeight: '600' },
  submitBtn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 13, color: '#dc2626', marginTop: 8 },
});
