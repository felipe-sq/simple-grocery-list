import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

import { AislePicker } from '@/components/AislePicker';
import { SuggestionsDropdown } from '@/components/SuggestionsDropdown';
import { useAisles } from '@/hooks/useAisles';
import { useItemSuggestions } from '@/hooks/useItemSuggestions';
import { supabase } from '@/lib/supabase';
import type { AddItemInput, Aisle, BarcodePrefill, Store, SuggestionResult } from '@/types';

export type AddItemSheetHandle = {
  // EC3-7: fills only the name from a barcode scan triggered inside the sheet
  setNameFromBarcode: (name: string | null, barcode: string, offline?: boolean) => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  store: Store;
  allStores: Store[];
  householdId: string;
  onSubmit: (data: AddItemInput) => Promise<{ error: string | null }>;
  barcodePrefill?: BarcodePrefill | null;
  onRequestBarcodeScanner: () => void;
};

export const AddItemSheet = forwardRef<AddItemSheetHandle, Props>(function AddItemSheet(
  { visible, onClose, store, allStores, householdId, onSubmit, barcodePrefill, onRequestBarcodeScanner },
  ref,
) {
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
  const [barcodeValue, setBarcodeValue] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [fromHistory, setFromHistory] = useState(false);

  const { aisles, createAisle } = useAisles(selectedStoreId, householdId);
  const { suggestions } = useItemSuggestions(name, householdId);

  // EC3-7: imperative handle so parent can fill only the name after in-sheet scan
  useImperativeHandle(ref, () => ({
    setNameFromBarcode(scannedName, barcode, offline = false) {
      setBarcodeValue(barcode);
      setFromHistory(false);
      if (offline) {
        setScanNotice("Can't look up this product offline.");
      } else if (scannedName === null) {
        setName('');
        setScanNotice('Product not found. Enter a name manually.');
      } else {
        setName(scannedName);
        setScanNotice(null);
        setNameError(null);
      }
    },
  }));

  // Apply barcode prefill when it arrives (header 📷 button flow)
  const appliedPrefillRef = useRef<BarcodePrefill | null>(null);
  useEffect(() => {
    if (!barcodePrefill || barcodePrefill === appliedPrefillRef.current) return;
    appliedPrefillRef.current = barcodePrefill;

    setBarcodeValue(barcodePrefill.barcode);
    setFromHistory(barcodePrefill.fromHistory);

    if (barcodePrefill.offline) {
      setScanNotice("Can't look up this product offline.");
    } else if (barcodePrefill.name === null) {
      setName('');
      setScanNotice('Product not found. Enter a name manually.');
    } else {
      setName(barcodePrefill.name);
      setScanNotice(null);
    }

    // EC3-2: also fill store + aisle when available from history
    if (barcodePrefill.fromHistory) {
      if (barcodePrefill.historyStoreId) setSelectedStoreId(barcodePrefill.historyStoreId);
      if (barcodePrefill.historyAisle) setSelectedAisle(barcodePrefill.historyAisle);
    }
  }, [barcodePrefill]);

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
    setBarcodeValue(null);
    setScanNotice(null);
    setFromHistory(false);
    appliedPrefillRef.current = null;
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
    setScanNotice(null);
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
      barcode: barcodeValue ?? null,
      source: barcodeValue ? 'barcode' : 'manual',
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
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close add item"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Item name</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.input, styles.nameInput]}
            placeholder="e.g. Oat milk"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={(t) => { setName(t); setNameError(null); setSubmitError(null); setScanNotice(null); }}
            returnKeyType="next"
            accessibilityLabel="Item name"
          />
          <Pressable
            style={styles.scanBtn}
            onPress={onRequestBarcodeScanner}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Scan barcode"
          >
            <Text style={styles.scanBtnIcon}>📷</Text>
          </Pressable>
        </View>

        {/* EC3-2: "From your history" label */}
        {fromHistory && (
          <Text style={styles.fromHistoryLabel}>📋 From your history</Text>
        )}
        {/* EC3-1 / EC3-5 scan notices */}
        {scanNotice !== null && (
          <Text style={styles.scanNotice}>{scanNotice}</Text>
        )}
        {nameError !== null && <Text style={styles.errorText}>{nameError}</Text>}
        <SuggestionsDropdown suggestions={suggestions} onSelect={handleSuggestionSelect} />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Store</Text>
            <Pressable
              style={styles.picker}
              onPress={() => setStoreOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={`Store: ${selectedStoreName}, ${storeOpen ? 'collapse' : 'expand'}`}
            >
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
                    accessibilityRole="button"
                    accessibilityLabel={s.name}
                    accessibilityState={{ selected: s.id === selectedStoreId }}
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
              accessibilityLabel="Quantity"
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
              accessibilityLabel="Unit"
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
          accessibilityLabel="Notes, optional"
        />

        {submitError !== null && <Text style={styles.errorText}>{submitError}</Text>}

        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          accessibilityRole="button"
          accessibilityLabel={submitting ? 'Adding item' : 'Add Item'}
          accessibilityState={{ disabled: !canSubmit || submitting }}
        >
          <Text style={styles.submitLabel}>{submitting ? 'Adding…' : 'Add Item'}</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1 },
  scanBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 0,
  },
  scanBtnIcon: { fontSize: 24 },
  fromHistoryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  scanNotice: {
    fontSize: 13,
    color: '#d97706',
    marginTop: 6,
  },
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
