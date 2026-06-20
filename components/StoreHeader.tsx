import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Store } from '@/types';

const COLOR_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'None', value: null },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Teal', value: '#0891b2' },
];

type Props = {
  store: Store;
  allStores: Store[];
  onRename: (storeId: string, name: string) => Promise<string | null>;
  onColorChange: (storeId: string, color: string | null) => void;
};

export function StoreHeader({ store, allStores, onRename, onColorChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(store.name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  function startEdit() {
    setName(store.name);
    setError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function commit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === store.name) {
      setName(store.name);
      setEditing(false);
      setError(null);
      return;
    }
    const isDuplicate = allStores.some(
      (s) => s.id !== store.id && s.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setError(`You already have a store called "${trimmed}".`);
      return;
    }
    const err = await onRename(store.id, trimmed);
    if (err) {
      setError(err);
    } else {
      setEditing(false);
      setError(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        {editing ? (
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={name}
              onChangeText={(t) => { setName(t); setError(null); }}
              onSubmitEditing={commit}
              onBlur={commit}
              autoCapitalize="characters"
              returnKeyType="done"
              selectTextOnFocus
              accessibilityLabel="Store name"
            />
            {error !== null && <Text style={styles.error}>{error}</Text>}
          </View>
        ) : (
          <Text style={styles.storeName}>{store.name.toUpperCase()}</Text>
        )}
        <Pressable
          onPress={startEdit}
          hitSlop={12}
          style={styles.renameBtnWrap}
          accessibilityRole="button"
          accessibilityLabel={`Rename ${store.name}`}
        >
          <Text style={styles.renameBtn}>Rename</Text>
        </Pressable>
      </View>

      <View style={styles.colorRow}>
        <Text style={styles.colorLabel}>Color</Text>
        <View style={styles.swatches}>
          {COLOR_OPTIONS.map((opt) => {
            const isSelected = store.color === opt.value;
            return (
              <Pressable
                key={opt.value ?? 'none'}
                onPress={() => onColorChange(store.id, opt.value)}
                style={[
                  styles.swatch,
                  { backgroundColor: opt.value ?? '#e5e7eb' },
                  isSelected && styles.swatchSelected,
                ]}
                accessibilityRole="radio"
                accessibilityLabel={`${opt.label} color`}
                accessibilityState={{ checked: isSelected }}
              >
                {isSelected && <View style={styles.swatchCheck} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  inputWrap: { flex: 1, marginRight: 12 },
  input: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    paddingVertical: 2,
  },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  storeName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#374151',
  },
  renameBtnWrap: { minHeight: 44, justifyContent: 'center' },
  renameBtn: { color: '#2563eb', fontWeight: '500', fontSize: 14 },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  colorLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '500', width: 36 },
  swatches: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#111827',
  },
  swatchCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
