import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Aisle } from '@/types';
import type { AisleMismatch } from '@/hooks/useCopyStaplesToList';

type Props = {
  visible: boolean;
  mismatches: AisleMismatch[];
  householdId: string;
  onConfirm: (overrides: Map<string, string>, updatedAislesByStore: Map<string, Aisle[]>) => void;
  onClose: () => void;
};

export function AisleMismatchModal({ visible, mismatches, householdId, onConfirm, onClose }: Props) {
  const [selections, setSelections] = useState<Map<string, string>>(new Map());
  const [localAislesByStore, setLocalAislesByStore] = useState<Map<string, Aisle[]>>(() => {
    const map = new Map<string, Aisle[]>();
    for (const m of mismatches) {
      if (!map.has(m.targetStoreId)) map.set(m.targetStoreId, [...m.availableAisles]);
    }
    return map;
  });
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [newAisleName, setNewAisleName] = useState('');
  const [creating, setCreating] = useState(false);

  const resolvedCount = mismatches.filter((m) => selections.has(m.staple.id)).length;
  const skipCount = mismatches.length - resolvedCount;

  function handleSelect(stapleId: string, aisleId: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(stapleId, aisleId);
      return next;
    });
  }

  async function handleCreateAisle(targetStoreId: string, stapleId: string) {
    const name = newAisleName.trim();
    if (!name) {
      setCreatingFor(null);
      return;
    }
    setCreating(true);
    const existing = localAislesByStore.get(targetStoreId) ?? [];
    const maxSort = existing.length > 0 ? Math.max(...existing.map((a) => a.sort_order)) + 10 : 0;
    const { data, error } = await supabase
      .from('aisles')
      .insert({ household_id: householdId, store_id: targetStoreId, name, sort_order: maxSort })
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      const newAisle = data as Aisle;
      setLocalAislesByStore((prev) => {
        const next = new Map(prev);
        next.set(targetStoreId, [...(next.get(targetStoreId) ?? []), newAisle]);
        return next;
      });
      handleSelect(stapleId, newAisle.id);
    }
    setCreatingFor(null);
    setNewAisleName('');
  }

  function handleConfirm() {
    onConfirm(selections, localAislesByStore);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Pick Aisles</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close pick aisles"
            >
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            These items need an aisle in the target store. Pick one for each, or skip.
          </Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {mismatches.map((m) => {
              const storeAisles = localAislesByStore.get(m.targetStoreId) ?? [];
              const selectedId = selections.get(m.staple.id) ?? null;
              const isCreatingHere = creatingFor === m.staple.id;

              return (
                <View key={m.staple.id} style={styles.item}>
                  <Text style={styles.itemName}>{m.staple.name}</Text>
                  <Text style={styles.itemStore}>{m.targetStoreName}</Text>

                  {storeAisles.map((aisle) => (
                    <Pressable
                      key={aisle.id}
                      style={styles.aisleRow}
                      onPress={() => handleSelect(m.staple.id, aisle.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: aisle.id === selectedId }}
                    >
                      <Text style={styles.radioIcon}>{aisle.id === selectedId ? '●' : '○'}</Text>
                      <Text style={[styles.aisleText, aisle.id === selectedId && styles.aisleTextSelected]}>
                        {aisle.name}
                      </Text>
                    </Pressable>
                  ))}

                  {isCreatingHere ? (
                    <View style={styles.createRow}>
                      <TextInput
                        style={styles.createInput}
                        placeholder="New aisle name"
                        placeholderTextColor="#9ca3af"
                        value={newAisleName}
                        onChangeText={setNewAisleName}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => handleCreateAisle(m.targetStoreId, m.staple.id)}
                      />
                      {creating ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <Pressable
                          onPress={() => handleCreateAisle(m.targetStoreId, m.staple.id)}
                          accessibilityRole="button"
                          accessibilityLabel="Add new aisle"
                        >
                          <Text style={styles.createBtnText}>Add</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <Pressable
                      style={styles.aisleRow}
                      onPress={() => { setCreatingFor(m.staple.id); setNewAisleName(''); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Add new aisle for ${m.targetStoreName}`}
                    >
                      <Text style={styles.newAisleText}>+ New aisle</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.confirmBtn}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel={
                skipCount > 0
                  ? `Add ${resolvedCount} item${resolvedCount !== 1 ? 's' : ''}, skip ${skipCount}`
                  : `Add ${resolvedCount} item${resolvedCount !== 1 ? 's' : ''}`
              }
            >
              <Text style={styles.confirmBtnText}>
                {skipCount > 0
                  ? `Add ${resolvedCount} item${resolvedCount !== 1 ? 's' : ''} (skip ${skipCount})`
                  : `Add ${resolvedCount} item${resolvedCount !== 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  closeBtn: { fontSize: 16, color: '#6b7280' },
  subtitle: { fontSize: 13, color: '#6b7280', paddingHorizontal: 20, paddingVertical: 10 },
  scroll: { flexGrow: 0 },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  itemStore: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  aisleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  radioIcon: { fontSize: 14, color: '#2563eb', marginRight: 10, width: 16 },
  aisleText: { fontSize: 15, color: '#374151' },
  aisleTextSelected: { color: '#2563eb', fontWeight: '600' },
  newAisleText: { fontSize: 14, color: '#2563eb', paddingLeft: 26 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 26,
    paddingRight: 4,
    paddingVertical: 6,
    gap: 8,
  },
  createInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    paddingVertical: 4,
  },
  createBtnText: { fontSize: 15, fontWeight: '600', color: '#2563eb' },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  confirmBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
