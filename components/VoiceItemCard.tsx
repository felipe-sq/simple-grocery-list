import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AislePicker } from '@/components/AislePicker';
import type { Aisle } from '@/types';

export type ReviewItemState = {
  key: string;
  name: string;
  aisleId: string | null;
  aisle: Pick<Aisle, 'id' | 'name' | 'sort_order' | 'color'> | null;
  qty: string;
  unit: string;
  checked: boolean;
  parsed: boolean;
  error: string | null;
};

type Props = {
  item: ReviewItemState;
  storeName: string;
  aisles: Aisle[];
  onUpdate: (key: string, update: Partial<ReviewItemState>) => void;
  onCreateAisle: (name: string) => Promise<{ aisle: Aisle | null; error: string | null }>;
};

export function VoiceItemCard({ item, storeName, aisles, onUpdate, onCreateAisle }: Props) {
  // EC2-3: unparsed items start in edit mode so user can correct the raw text
  const [editing, setEditing] = useState(!item.parsed);

  const aisleUnknown = item.aisleId === null;

  function openEdit() {
    setEditing(true);
    onUpdate(item.key, { error: null });
  }

  function handleAisleSelect(aisle: Aisle) {
    onUpdate(item.key, {
      aisleId: aisle.id,
      aisle: { id: aisle.id, name: aisle.name, sort_order: aisle.sort_order, color: aisle.color },
    });
  }

  async function handleCreateAisle(
    name: string,
  ): Promise<{ aisle: Aisle | null; error: string | null }> {
    const result = await onCreateAisle(name);
    if (result.aisle) {
      onUpdate(item.key, {
        aisleId: result.aisle.id,
        aisle: {
          id: result.aisle.id,
          name: result.aisle.name,
          sort_order: result.aisle.sort_order,
          color: result.aisle.color,
        },
      });
    }
    return result;
  }

  if (editing) {
    return (
      <View style={styles.card}>
        <View style={styles.editRow}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={item.name}
            onChangeText={(t) => onUpdate(item.key, { name: t, error: null })}
            placeholder="Item name"
            placeholderTextColor="#9ca3af"
            autoCapitalize="sentences"
          />
        </View>

        <View style={styles.editRow}>
          <Text style={styles.label}>Aisle</Text>
          <AislePicker
            aisles={aisles}
            selectedAisleId={item.aisleId}
            onSelect={handleAisleSelect}
            onCreateAisle={handleCreateAisle}
          />
        </View>

        <View style={styles.editRowHalf}>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Qty</Text>
            <TextInput
              style={styles.input}
              value={item.qty}
              onChangeText={(t) => onUpdate(item.key, { qty: t })}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Unit</Text>
            <TextInput
              style={styles.input}
              value={item.unit}
              onChangeText={(t) => onUpdate(item.key, { unit: t })}
              placeholder="e.g. cans"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />
          </View>
        </View>

        <Pressable
          style={styles.doneBtn}
          onPress={() => setEditing(false)}
          accessibilityRole="button"
          accessibilityLabel="Done editing"
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, !item.checked && styles.cardDimmed]}>
      <View style={styles.headerRow}>
        <Pressable
          style={[styles.checkbox, item.checked && styles.checkboxChecked]}
          onPress={() => onUpdate(item.key, { checked: !item.checked, error: null })}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          accessibilityLabel={`${item.name}, ${item.checked ? 'checked' : 'unchecked'}`}
          hitSlop={11}
        >
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Pressable
          onPress={openEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Text style={styles.editBtnLabel}>Edit ✎</Text>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>Store: {storeName}</Text>
        <Text style={[styles.meta, aisleUnknown && styles.aisleAmber]}>
          {'  '}Aisle: {aisleUnknown ? '——' : item.aisle?.name}
        </Text>
      </View>

      {aisleUnknown && (
        <Text style={styles.aisleHint}>Tap Edit to assign an aisle.</Text>
      )}

      <Text style={styles.meta}>
        Qty: {item.qty || '1'}
        {item.unit ? `  Unit: ${item.unit}` : ''}
      </Text>

      {item.error !== null && <Text style={styles.errorText}>{item.error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardDimmed: { opacity: 0.65 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  editBtnLabel: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  meta: { fontSize: 13, color: '#6b7280' },
  aisleAmber: { color: '#d97706', fontWeight: '600' },
  aisleHint: { fontSize: 12, color: '#d97706', marginBottom: 4 },
  errorText: { fontSize: 13, color: '#dc2626', marginTop: 6 },
  // Edit mode
  editRow: { marginBottom: 12 },
  editRowHalf: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfCol: { flex: 1 },
  label: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  doneBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
