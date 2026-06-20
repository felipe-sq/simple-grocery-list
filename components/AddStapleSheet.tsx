import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AislePicker } from '@/components/AislePicker';
import { SheetModal, SheetScrollView } from '@/components/SheetModal';
import { SuggestionsDropdown } from '@/components/SuggestionsDropdown';
import { useAisles } from '@/hooks/useAisles';
import { useItemSuggestions } from '@/hooks/useItemSuggestions';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { enqueue } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';
import type { Aisle, Store, StapleItemWithDetails, SuggestionResult } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  householdId: string;
  allStores: Store[];
  stapleToEdit: StapleItemWithDetails | null;
  onSaved?: () => void;
};

export function AddStapleSheet({ visible, onClose, householdId, allStores, stapleToEdit, onSaved }: Props) {
  const isEdit = stapleToEdit !== null;

  const [name, setName] = useState(() => stapleToEdit?.name ?? '');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
    () => stapleToEdit?.default_store_id ?? null,
  );
  const [selectedAisle, setSelectedAisle] = useState<Pick<Aisle, 'id' | 'name' | 'sort_order'> | null>(
    () =>
      stapleToEdit?.aisle && stapleToEdit.default_aisle_id
        ? { id: stapleToEdit.default_aisle_id, name: stapleToEdit.aisle.name, sort_order: 0 }
        : null,
  );
  const [qty, setQty] = useState(() =>
    stapleToEdit?.default_qty !== null && stapleToEdit?.default_qty !== undefined
      ? String(stapleToEdit.default_qty)
      : '',
  );
  const [unit, setUnit] = useState(() => stapleToEdit?.default_unit ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { aisles, createAisle } = useAisles(selectedStoreId ?? '', householdId);
  const { suggestions } = useItemSuggestions(name, householdId);
  const { isOnline } = useNetworkStatus();

  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  function handleSuggestionSelect(s: SuggestionResult) {
    setName(s.name);
    setNameError(null);
    setSubmitError(null);
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) { setNameError('Item name is required.'); return; }

    setNameError(null);
    setSubmitError(null);

    if (!isOnline) { await performSave(trimmedName); return; }

    setSubmitting(true);

    const baseQuery = supabase
      .from('staple_items')
      .select('id')
      .eq('household_id', householdId)
      .ilike('name', trimmedName);

    const { data: dupeRows } = await (
      isEdit && stapleToEdit
        ? baseQuery.neq('id', stapleToEdit.id).limit(1)
        : baseQuery.limit(1)
    );

    setSubmitting(false);

    if (dupeRows && dupeRows.length > 0) {
      Alert.alert(
        'Duplicate staple',
        `You already have "${trimmedName}" in your staples. Save as a duplicate?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: () => performSave(trimmedName) },
        ],
      );
      return;
    }

    await performSave(trimmedName);
  }

  async function performSave(trimmedName: string) {
    setSubmitting(true);
    let error: string | null = null;

    if (isEdit && stapleToEdit) {
      const { error: updateError } = await supabase
        .from('staple_items')
        .update({
          name: trimmedName,
          default_store_id: selectedStoreId,
          default_aisle_id: selectedAisle?.id ?? null,
          default_qty: qty ? parseFloat(qty) : null,
          default_unit: unit.trim() || null,
        })
        .eq('id', stapleToEdit.id);
      error = updateError?.message ?? null;
    } else if (!isOnline) {
      await enqueue({
        type: 'add_staple',
        householdId,
        staple: {
          household_id: householdId,
          name: trimmedName,
          default_store_id: selectedStoreId,
          default_aisle_id: selectedAisle?.id ?? null,
          default_qty: qty ? parseFloat(qty) : null,
          default_unit: unit.trim() || null,
          sort_order: Date.now(),
        },
      });
    } else {
      const { data: topRow } = await supabase
        .from('staple_items')
        .select('sort_order')
        .eq('household_id', householdId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const { error: insertError } = await supabase.from('staple_items').insert({
        household_id: householdId,
        name: trimmedName,
        default_store_id: selectedStoreId,
        default_aisle_id: selectedAisle?.id ?? null,
        default_qty: qty ? parseFloat(qty) : null,
        default_unit: unit.trim() || null,
        sort_order: (topRow?.[0]?.sort_order ?? -10) + 10,
      });
      error = insertError?.message ?? null;
    }

    setSubmitting(false);
    if (error) { setSubmitError(error); } else { onSaved?.(); onClose(); }
  }

  async function handleDelete() {
    if (!stapleToEdit) return;
    setDeleting(true);
    await supabase.from('staple_items').delete().eq('id', stapleToEdit.id);
    setDeleting(false);
    onSaved?.();
    onClose();
  }

  const selectedStoreName = allStores.find((s) => s.id === selectedStoreId)?.name ?? '';
  const canSubmit = name.trim().length > 0;

  return (
    <SheetModal visible={visible} onClose={handleClose}>
      <View style={styles.header}>
        <Text style={styles.title}>{isEdit ? 'Edit Staple' : 'Add Staple'}</Text>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <SheetScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Item name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Oat milk"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={(t) => { setName(t); setNameError(null); setSubmitError(null); }}
          returnKeyType="next"
          accessibilityLabel="Item name"
        />
        {nameError !== null && <Text style={styles.errorText}>{nameError}</Text>}
        <SuggestionsDropdown suggestions={suggestions} onSelect={handleSuggestionSelect} />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Default Store</Text>
            <Pressable
              style={styles.picker}
              onPress={() => setStoreOpen((v) => !v)}
              accessibilityLabel="Select default store"
              accessibilityRole="button"
            >
              <Text style={[styles.pickerText, !selectedStoreId && styles.placeholder]} numberOfLines={1}>
                {selectedStoreId ? selectedStoreName : 'Select store'}
              </Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>
            {storeOpen && (
              <View style={styles.storeDropdown}>
                <Pressable
                  style={styles.storeOption}
                  onPress={() => { setSelectedStoreId(null); setSelectedAisle(null); setStoreOpen(false); }}
                >
                  <Text style={[styles.storeOptionText, styles.placeholder]}>None</Text>
                </Pressable>
                {allStores.map((s) => (
                  <Pressable
                    key={s.id}
                    style={[styles.storeOption, s.id === selectedStoreId && styles.storeOptionActive]}
                    onPress={() => { setSelectedStoreId(s.id); setSelectedAisle(null); setStoreOpen(false); }}
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
            <Text style={styles.label}>Default Aisle</Text>
            {selectedStoreId ? (
              <AislePicker
                aisles={aisles}
                selectedAisleId={selectedAisle?.id ?? null}
                onSelect={(aisle) => setSelectedAisle({ id: aisle.id, name: aisle.name, sort_order: aisle.sort_order })}
                onCreateAisle={createAisle}
              />
            ) : (
              <View style={[styles.picker, styles.pickerDisabled]}>
                <Text style={[styles.pickerText, styles.placeholder]} numberOfLines={1}>Select store first</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.qtyField}>
            <Text style={styles.label}>Default Qty</Text>
            <TextInput
              style={styles.input}
              placeholder="—"
              placeholderTextColor="#9ca3af"
              value={qty}
              onChangeText={setQty}
              keyboardType="numeric"
              returnKeyType="next"
              accessibilityLabel="Default quantity"
            />
          </View>
          <View style={styles.unitField}>
            <Text style={styles.label}>Default Unit</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. lbs, cans"
              placeholderTextColor="#9ca3af"
              value={unit}
              onChangeText={setUnit}
              returnKeyType="done"
              accessibilityLabel="Default unit"
            />
          </View>
        </View>

        {submitError !== null && <Text style={styles.errorText}>{submitError}</Text>}

        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityLabel="Save staple"
          accessibilityRole="button"
        >
          <Text style={styles.submitLabel}>{submitting ? 'Saving…' : 'Save Staple'}</Text>
        </Pressable>

        {isEdit && (
          <View style={styles.deleteSection}>
            <View style={styles.divider} />
            {deleteConfirming ? (
              <View style={styles.deleteConfirm}>
                <Text style={styles.deleteConfirmText}>Delete {stapleToEdit?.name ?? ''} from staples?</Text>
                <View style={styles.deleteConfirmBtns}>
                  <Pressable
                    style={styles.deleteConfirmCancelBtn}
                    onPress={() => setDeleteConfirming(false)}
                    accessibilityLabel="Cancel delete"
                    accessibilityRole="button"
                  >
                    <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.deleteConfirmDeleteBtn, deleting && styles.deleteConfirmDeleteBtnDisabled]}
                    onPress={handleDelete}
                    disabled={deleting}
                    accessibilityLabel={`Delete ${stapleToEdit?.name ?? ''} from staples`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.deleteConfirmDeleteText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.deleteBtn}
                onPress={() => setDeleteConfirming(true)}
                accessibilityLabel="Delete this staple"
                accessibilityRole="button"
              >
                <Text style={styles.deleteBtnText}>🗑 Delete this staple</Text>
              </Pressable>
            )}
          </View>
        )}
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
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
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
  pickerDisabled: { backgroundColor: '#f9fafb' },
  pickerText: { flex: 1, fontSize: 15, color: '#111827' },
  placeholder: { color: '#9ca3af' },
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
  deleteSection: { marginTop: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb', marginVertical: 16 },
  deleteBtn: { paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { fontSize: 15, color: '#dc2626' },
  deleteConfirm: { paddingVertical: 8 },
  deleteConfirmText: { fontSize: 15, color: '#374151', textAlign: 'center', marginBottom: 16 },
  deleteConfirmBtns: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  deleteConfirmCancelBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  deleteConfirmCancelText: { fontSize: 15, color: '#374151' },
  deleteConfirmDeleteBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  deleteConfirmDeleteBtnDisabled: { backgroundColor: '#fca5a5' },
  deleteConfirmDeleteText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
