import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Aisle } from '@/types';

type Props = {
  aisles: Aisle[];
  selectedAisleId: string | null;
  onSelect: (aisle: Aisle) => void;
  onCreateAisle: (name: string) => Promise<{ aisle: Aisle | null; error: string | null }>;
};

export function AislePicker({ aisles, selectedAisleId, onSelect, onCreateAisle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const selectedAisle = aisles.find((a) => a.id === selectedAisleId);

  function openPicker() {
    setExpanded(true);
    // EC1-4: no aisles yet — jump straight to the create input
    if (aisles.length === 0) {
      setCreatingNew(true);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  function startCreating() {
    setCreatingNew(true);
    setNewName('');
    setCreateError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function commitCreate() {
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreatingNew(false);
      if (aisles.length === 0) setExpanded(false);
      return;
    }
    setCreating(true);
    const { aisle, error } = await onCreateAisle(trimmed);
    setCreating(false);
    if (error) {
      setCreateError(error);
    } else if (aisle) {
      onSelect(aisle);
      setCreatingNew(false);
      setNewName('');
      setExpanded(false);
    }
  }

  return (
    <View>
      <Pressable style={styles.picker} onPress={openPicker}>
        <Text
          style={[styles.pickerText, !selectedAisle && styles.placeholder]}
          numberOfLines={1}
        >
          {selectedAisle ? selectedAisle.name : 'Select aisle'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {expanded && (
        <View style={styles.dropdown}>
          {aisles.length === 0 && !creatingNew && (
            <Text style={styles.emptyNote}>No aisles yet — add one to get started.</Text>
          )}

          {aisles.map((aisle) => (
            <Pressable
              key={aisle.id}
              style={[styles.option, aisle.id === selectedAisleId && styles.optionActive]}
              onPress={() => { onSelect(aisle); setExpanded(false); setCreatingNew(false); }}
            >
              <Text
                style={[
                  styles.optionText,
                  aisle.id === selectedAisleId && styles.optionTextActive,
                ]}
              >
                {aisle.name}
              </Text>
            </Pressable>
          ))}

          {creatingNew ? (
            <View style={styles.createRow}>
              <TextInput
                ref={inputRef}
                style={styles.createInput}
                placeholder="New aisle name"
                placeholderTextColor="#9ca3af"
                value={newName}
                onChangeText={(t) => { setNewName(t); setCreateError(null); }}
                onSubmitEditing={commitCreate}
                returnKeyType="done"
              />
              <Pressable onPress={commitCreate} disabled={creating} style={styles.createBtn}>
                <Text style={styles.createBtnText}>{creating ? '…' : 'Add'}</Text>
              </Pressable>
              {createError !== null && <Text style={styles.errorText}>{createError}</Text>}
            </View>
          ) : (
            <Pressable style={styles.newAisleRow} onPress={startCreating}>
              <Text style={styles.newAisleText}>+ New aisle</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  placeholder: { color: '#9ca3af' },
  chevron: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 2,
    overflow: 'hidden',
  },
  emptyNote: { fontSize: 13, color: '#6b7280', padding: 12 },
  option: { paddingVertical: 12, paddingHorizontal: 14 },
  optionActive: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: 15, color: '#111827' },
  optionTextActive: { color: '#2563eb', fontWeight: '600' },
  newAisleRow: { paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  newAisleText: { color: '#2563eb', fontSize: 15 },
  createRow: { padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  createInput: {
    fontSize: 15,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    paddingVertical: 4,
    marginBottom: 8,
  },
  createBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 6 },
});
