import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Aisle } from '@/types';

type Props = {
  existingAisles: Aisle[];
  onAdd: (name: string) => Promise<string | null>;
};

export function AddAisleRow({ existingAisles, onAdd }: Props) {
  const [active, setActive] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  function start() {
    setName('');
    setError(null);
    setActive(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function commit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setActive(false);
      return;
    }
    // EC8-1: block duplicate aisle name within same store
    const isDuplicate = existingAisles.some(
      (a) => a.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setError(`This store already has an aisle called "${trimmed}".`);
      return;
    }
    const err = await onAdd(trimmed);
    if (err) {
      setError(err);
    } else {
      setActive(false);
      setName('');
    }
  }

  if (!active) {
    return (
      <Pressable onPress={start} style={styles.addButton}>
        <Text style={styles.addText}>+ Add aisle</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.form}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Aisle name"
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={(t) => { setName(t); setError(null); }}
        onSubmitEditing={commit}
        onBlur={commit}
        returnKeyType="done"
      />
      {error !== null && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: { paddingHorizontal: 16, paddingVertical: 13 },
  addText: { color: '#2563eb', fontSize: 15 },
  form: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  input: {
    fontSize: 15,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    paddingVertical: 4,
  },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
});
