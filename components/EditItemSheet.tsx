import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AislePicker } from '@/components/AislePicker';
import { SheetModal, SheetScrollView } from '@/components/SheetModal';
import { useAisles } from '@/hooks/useAisles';
import { supabase } from '@/lib/supabase';
import type { Aisle, EditItemInput, GroceryItemWithAisle, Store } from '@/types';

type FormValues = {
  name: string;
  selectedStoreId: string;
  selectedAisle: Pick<Aisle, 'id' | 'name' | 'sort_order'> | null;
  qty: string;
  unit: string;
  notes: string;
};

function formFromItem(item: GroceryItemWithAisle): FormValues {
  return {
    name: item.name,
    selectedStoreId: item.store_id,
    selectedAisle: item.aisle,
    qty: item.quantity !== null ? String(item.quantity) : '',
    unit: item.unit ?? '',
    notes: item.notes ?? '',
  };
}

type Props = {
  item: GroceryItemWithAisle | null;
  allStores: Store[];
  householdId: string;
  onSubmit: (itemId: string, data: EditItemInput) => Promise<{ error: string | null }>;
  onClose: () => void;
};

export function EditItemSheet({ item, allStores, householdId, onSubmit, onClose }: Props) {
  const [form, setForm] = useState<FormValues>(() =>
    item ? formFromItem(item) : { name: '', selectedStoreId: '', selectedAisle: null, qty: '', unit: '', notes: '' },
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  const { aisles, createAisle } = useAisles(form.selectedStoreId, householdId);

  const isDirty = item !== null && (
    form.name.trim() !== item.name ||
    form.selectedStoreId !== item.store_id ||
    form.selectedAisle?.id !== item.aisle_id ||
    form.qty !== (item.quantity !== null ? String(item.quantity) : '') ||
    form.unit !== (item.unit ?? '') ||
    form.notes !== (item.notes ?? '')
  );
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  const handleClose = useCallback(() => {
    if (isDirtyRef.current) {
      Alert.alert('Discard changes?', undefined, [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
    } else {
      onClose();
    }
  }, [onClose]);

  async function handleSubmit() {
    if (!item || !form.name.trim() || !form.selectedAisle) return;
    setSubmitting(true);
    setNameError(null);
    setSubmitError(null);

    const { data: dupeRows } = await supabase
      .from('grocery_items')
      .select('id')
      .eq('household_id', householdId)
      .eq('store_id', form.selectedStoreId)
      .eq('checked', false)
      .ilike('name', form.name.trim())
      .neq('id', item.id)
      .limit(1);

    if (dupeRows && dupeRows.length > 0) {
      const storeName = allStores.find((s) => s.id === form.selectedStoreId)?.name ?? 'this store';
      setNameError(`${form.name.trim()} is already on your ${storeName} list.`);
      setSubmitting(false);
      return;
    }

    const result = await onSubmit(item.id, {
      name: form.name.trim(),
      storeId: form.selectedStoreId,
      aisleId: form.selectedAisle.id,
      aisle: form.selectedAisle,
      quantity: form.qty ? parseFloat(form.qty) : null,
      unit: form.unit.trim() || null,
      notes: form.notes.trim() || null,
    });

    setSubmitting(false);
    if (result.error) { setSubmitError(result.error); } else { onClose(); }
  }

  const selectedStoreName = allStores.find((s) => s.id === form.selectedStoreId)?.name ?? '';
  const canSubmit = form.name.trim().length > 0 && form.selectedAisle !== null;

  return (
    <SheetModal visible={item !== null} onClose={handleClose}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Item</Text>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close edit item">
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <SheetScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Item name</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor="#9ca3af"
          value={form.name}
          onChangeText={(t) => { setForm((prev) => ({ ...prev, name: t })); setNameError(null); setSubmitError(null); }}
          returnKeyType="next"
          accessibilityLabel="Item name"
        />
        {nameError !== null && <Text style={styles.errorText}>{nameError}</Text>}

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
                    style={[styles.storeOption, s.id === form.selectedStoreId && styles.storeOptionActive]}
                    onPress={() => { setForm((prev) => ({ ...prev, selectedStoreId: s.id, selectedAisle: null })); setNameError(null); setStoreOpen(false); }}
                    accessibilityRole="button"
                    accessibilityLabel={s.name}
                    accessibilityState={{ selected: s.id === form.selectedStoreId }}
                  >
                    <Text style={[styles.storeOptionText, s.id === form.selectedStoreId && styles.storeOptionTextActive]}>
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
              selectedAisleId={form.selectedAisle?.id ?? null}
              onSelect={(aisle) => setForm((prev) => ({ ...prev, selectedAisle: { id: aisle.id, name: aisle.name, sort_order: aisle.sort_order } }))}
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
              value={form.qty}
              onChangeText={(t) => setForm((prev) => ({ ...prev, qty: t }))}
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
              value={form.unit}
              onChangeText={(t) => setForm((prev) => ({ ...prev, unit: t }))}
              returnKeyType="next"
              accessibilityLabel="Unit"
            />
          </View>
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholderTextColor="#9ca3af"
          value={form.notes}
          onChangeText={(t) => setForm((prev) => ({ ...prev, notes: t }))}
          multiline
          accessibilityLabel="Notes, optional"
        />

        {submitError !== null && <Text style={styles.errorText}>{submitError}</Text>}

        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          accessibilityRole="button"
          accessibilityLabel={submitting ? 'Saving changes' : 'Save Changes'}
          accessibilityState={{ disabled: !canSubmit || submitting }}
        >
          <Text style={styles.submitLabel}>{submitting ? 'Saving…' : 'Save Changes'}</Text>
        </Pressable>
      </SheetScrollView>
    </SheetModal>
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
