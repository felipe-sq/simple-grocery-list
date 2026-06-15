import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Store } from '@/types';

type Props = {
  store: Store;
  allStores: Store[];
  onRename: (storeId: string, name: string) => Promise<string | null>;
};

export function StoreHeader({ store, allStores, onRename }: Props) {
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
    // EC8-4: block duplicate store name
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
    <View style={styles.header}>
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
          />
          {error !== null && <Text style={styles.error}>{error}</Text>}
        </View>
      ) : (
        <Text style={styles.storeName}>{store.name.toUpperCase()}</Text>
      )}
      <Pressable onPress={startEdit} hitSlop={8}>
        <Text style={styles.renameBtn}>Rename</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
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
  renameBtn: { color: '#2563eb', fontWeight: '500', fontSize: 14 },
});
