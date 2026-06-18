import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const inputRef = useRef<TextInput>(null);

  function startEdit() {
    setName(aisle.name);
    setError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function commitEdit() {
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
    const err = await onSaveName(aisle.id, trimmed);
    if (err) {
      setError(err);
    } else {
      setEditing(false);
      setError(null);
    }
  }

  return (
    <ScaleDecorator>
      <View style={[styles.row, isActive && styles.rowActive]}>
        <Pressable onLongPress={drag} style={styles.dragHandle} hitSlop={8}>
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
            />
            {error !== null && <Text style={styles.errorText}>{error}</Text>}
            {onDeleteRequest !== undefined && (
              <Pressable
                style={styles.deleteBtn}
                onPress={() => { setEditing(false); onDeleteRequest(aisle.id); }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete aisle ${aisle.name}`}
              >
                <Text style={styles.deleteBtnText}>Delete aisle</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Text style={styles.aisleName}>{aisle.name}</Text>
        )}

        <Pressable onPress={startEdit} style={styles.editButton} hitSlop={8}>
          <Text style={styles.editIcon}>✎</Text>
        </Pressable>
      </View>
    </ScaleDecorator>
  );
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
    fontSize: 15,
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
