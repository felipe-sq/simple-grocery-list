import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';

import type { Aisle } from '@/types';

type Props = {
  aisle: Aisle;
  storeAisles: Aisle[];
  drag: () => void;
  isActive: boolean;
  onSaveName: (aisleId: string, newName: string) => Promise<string | null>;
  onDeleteRequest?: (aisleId: string) => void;
};

export function AisleRow({ aisle, storeAisles, drag, isActive, onSaveName, onDeleteRequest }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(aisle.name);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);

  function startEdit() {
    deletingRef.current = false;
    setName(aisle.name);
    setError(null);
    setDeleteConfirming(false);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function commitEdit() {
    if (submittingRef.current || deletingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === aisle.name) {
      setName(aisle.name);
      setEditing(false);
      setError(null);
      return;
    }
    // EC8-1: block duplicate aisle name within the same store
    const isDuplicate = storeAisles.some(
      (a) => a.id !== aisle.id && a.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setError(`This store already has an aisle called "${trimmed}".`);
      return;
    }
    submittingRef.current = true;
    const err = await onSaveName(aisle.id, trimmed);
    submittingRef.current = false;
    if (err) {
      setError(err);
    } else {
      setEditing(false);
      setDeleteConfirming(false);
      setError(null);
    }
  }

  const inner = (
    <View style={[styles.row, isActive && styles.rowActive]}>
        <Pressable
          onLongPress={drag}
          style={styles.dragHandle}
          hitSlop={9}
          accessibilityRole="button"
          accessibilityLabel={`Drag to reorder ${aisle.name}`}
        >
          <Text style={styles.dragIcon}>≡</Text>
        </Pressable>

        {editing ? (
          <View style={styles.editContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(null);
              }}
              onSubmitEditing={commitEdit}
              onBlur={commitEdit}
              returnKeyType="done"
              selectTextOnFocus
              accessibilityLabel="Aisle name"
            />
            {error !== null && <Text style={styles.errorText}>{error}</Text>}
            {onDeleteRequest !== undefined && (
              deleteConfirming ? (
                <View style={styles.deleteConfirmRow}>
                  <Text style={styles.deleteConfirmLabel}>Delete "{aisle.name}"?</Text>
                  <View style={styles.deleteConfirmBtns}>
                    <Pressable
                      style={styles.deleteCancelBtn}
                      onPress={() => { deletingRef.current = false; setDeleteConfirming(false); }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel delete"
                    >
                      <Text style={styles.deleteCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteConfirmBtn}
                      onPress={() => { setEditing(false); setDeleteConfirming(false); deletingRef.current = false; onDeleteRequest(aisle.id); }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Confirm delete aisle ${aisle.name}`}
                    >
                      <Text style={styles.deleteConfirmText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.deleteBtn}
                  onPressIn={() => { deletingRef.current = true; }}
                  onPress={() => setDeleteConfirming(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete aisle ${aisle.name}`}
                >
                  <Text style={styles.deleteBtnText}>Delete aisle</Text>
                </Pressable>
              )
            )}
          </View>
        ) : (
          <Text style={styles.aisleName}>{aisle.name}</Text>
        )}

        <Pressable
          onPress={startEdit}
          style={styles.editButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Edit aisle ${aisle.name}`}
        >
          <Text style={styles.editIcon}>✎</Text>
        </Pressable>
      </View>
  );
  return Platform.OS === 'web' ? inner : <ScaleDecorator>{inner}</ScaleDecorator>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowActive: {
    backgroundColor: '#f3f4f6',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dragHandle: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  dragIcon: {
    fontSize: 18,
    color: '#9ca3af',
  },
  editContainer: {
    flex: 1,
  },
  input: {
    fontSize: 16,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    paddingVertical: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  deleteBtn: {
    marginTop: 10,
    paddingVertical: 6,
  },
  deleteBtnText: {
    fontSize: 13,
    color: '#dc2626',
  },
  deleteConfirmRow: { marginTop: 10 },
  deleteConfirmLabel: { fontSize: 13, color: '#374151', marginBottom: 8 },
  deleteConfirmBtns: { flexDirection: 'row', gap: 8 },
  deleteCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center' as const,
  },
  deleteCancelText: { fontSize: 13, color: '#374151' },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center' as const,
  },
  deleteConfirmText: { fontSize: 13, color: '#fff', fontWeight: '600' as const },
  aisleName: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  editButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  editIcon: {
    fontSize: 16,
    color: '#6b7280',
  },
});
