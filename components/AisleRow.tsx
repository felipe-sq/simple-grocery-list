import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';

import { AISLE_COLOR_KEYS, AISLE_PALETTE, DEFAULT_AISLE_COLOR, type AisleColorKey } from '@/lib/aisleColors';
import type { Aisle } from '@/types';

type Props = {
  aisle: Aisle;
  storeAisles: Aisle[];
  drag: () => void;
  isActive: boolean;
  onSaveName: (aisleId: string, newName: string) => Promise<string | null>;
  onSaveColor: (aisleId: string, color: string | null) => Promise<void>;
  onDeleteRequest?: (aisleId: string) => void;
};

export function AisleRow({ aisle, storeAisles, drag, isActive, onSaveName, onSaveColor, onDeleteRequest }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(aisle.name);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);

  const activeColor = (aisle.color ?? DEFAULT_AISLE_COLOR) as AisleColorKey;

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

            <View style={styles.swatchRow}>
              {AISLE_COLOR_KEYS.map((key) => {
                const theme = AISLE_PALETTE[key];
                const selected = activeColor === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => onSaveColor(aisle.id, key)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Set color ${key}`}
                    accessibilityState={{ selected }}
                    style={[
                      styles.swatch,
                      { backgroundColor: theme.bg, borderColor: theme.border },
                      selected && { borderColor: theme.text, borderWidth: 2 },
                    ]}
                  >
                    {selected && <View style={[styles.swatchDot, { backgroundColor: theme.text }]} />}
                  </Pressable>
                );
              })}
            </View>

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
          <View style={styles.nameRow}>
            <View style={[styles.colorDot, { backgroundColor: AISLE_PALETTE[activeColor].text }]} />
            <Text style={styles.aisleName}>{aisle.name}</Text>
          </View>
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
  swatchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
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
