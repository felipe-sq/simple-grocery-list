import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StoreSection } from '@/components/StoreSection';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/lib/supabase';
import type { Aisle, Store } from '@/types';

const MAX_STORES = 3;

export default function StoresSettingsScreen() {
  const { householdId } = useHousehold();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeAisles, setStoreAisles] = useState<Record<string, Aisle[]>>({});
  const [loading, setLoading] = useState(true);
  const [addingStore, setAddingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [addStoreError, setAddStoreError] = useState<string | null>(null);
  const storeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!householdId) {
      let active = true;
      queueMicrotask(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }

    async function fetchAll() {
      const [storesRes, aislesRes] = await Promise.all([
        supabase.from('stores').select('*').eq('household_id', householdId).order('sort_order'),
        supabase.from('aisles').select('*').eq('household_id', householdId).order('sort_order'),
      ]);
      if (storesRes.data) setStores(storesRes.data as Store[]);
      if (aislesRes.data) {
        const byStore: Record<string, Aisle[]> = {};
        for (const aisle of aislesRes.data as Aisle[]) {
          if (!byStore[aisle.store_id]) byStore[aisle.store_id] = [];
          byStore[aisle.store_id].push(aisle);
        }
        setStoreAisles(byStore);
      }
      setLoading(false);
    }

    fetchAll();

    const channel = supabase
      .channel(`stores_aisles_${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores', filter: `household_id=eq.${householdId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aisles', filter: `household_id=eq.${householdId}` }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [householdId]);

  async function handleStoreRename(storeId: string, name: string): Promise<string | null> {
    const { error } = await supabase.from('stores').update({ name }).eq('id', storeId);
    if (!error) setStores((prev) => prev.map((s) => s.id === storeId ? { ...s, name } : s));
    return error?.message ?? null;
  }

  async function handleAisleAdd(storeId: string, name: string): Promise<string | null> {
    const existing = storeAisles[storeId] ?? [];
    const sortOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.sort_order)) + 10 : 0;
    const { data, error } = await supabase
      .from('aisles')
      .insert({ household_id: householdId, store_id: storeId, name, sort_order: sortOrder })
      .select()
      .single();
    if (error) return error.message;
    if (data) setStoreAisles((prev) => ({ ...prev, [storeId]: [...(prev[storeId] ?? []), data as Aisle] }));
    return null;
  }

  async function handleAisleRename(aisleId: string, name: string): Promise<string | null> {
    const { error } = await supabase.from('aisles').update({ name }).eq('id', aisleId);
    if (!error) {
      setStoreAisles((prev) => {
        const next: Record<string, Aisle[]> = {};
        for (const sid of Object.keys(prev)) {
          next[sid] = prev[sid].map((a) => (a.id === aisleId ? { ...a, name } : a));
        }
        return next;
      });
    }
    return error?.message ?? null;
  }

  async function handleAisleReorder(storeId: string, aisles: Aisle[]): Promise<void> {
    setStoreAisles((prev) => ({ ...prev, [storeId]: aisles }));
    await Promise.all(aisles.map((a, idx) => supabase.from('aisles').update({ sort_order: idx * 10 }).eq('id', a.id)));
  }

  // EC8-2: delete an aisle, optionally moving its items to another aisle first
  async function executeAisleDelete(aisleId: string, moveToAisleId: string | null): Promise<void> {
    if (moveToAisleId !== null) {
      await supabase
        .from('grocery_items')
        .update({ aisle_id: moveToAisleId })
        .eq('aisle_id', aisleId)
        .eq('household_id', householdId);
    }
    await supabase.from('aisles').delete().eq('id', aisleId);
    setStoreAisles((prev) => {
      const next: Record<string, Aisle[]> = {};
      for (const sid of Object.keys(prev)) {
        next[sid] = prev[sid].filter((a) => a.id !== aisleId);
      }
      return next;
    });
  }

  function handleAisleDeleteRequest(storeId: string, aisleId: string): void {
    const aisleName = storeAisles[storeId]?.find((a) => a.id === aisleId)?.name ?? 'this aisle';
    const otherAisles = (storeAisles[storeId] ?? []).filter((a) => a.id !== aisleId);

    async function deleteWithCount() {
      const { count } = await supabase
        .from('grocery_items')
        .select('id', { count: 'exact', head: true })
        .eq('aisle_id', aisleId)
        .eq('household_id', householdId);

      const itemCount = count ?? 0;

      if (itemCount === 0) {
        // No items — AisleRow already confirmed inline, just delete
        await executeAisleDelete(aisleId, null);
        return;
      }

      if (otherAisles.length === 0) {
        Alert.alert(
          'Cannot delete',
          `Move items out of "${aisleName}" first, or delete the items before removing this aisle.`,
          [{ text: 'OK' }],
        );
        return;
      }

      // Items exist and there are other aisles to move them to
      Alert.alert(
        `"${aisleName}" has ${itemCount} item${itemCount !== 1 ? 's' : ''}. Where should they go?`,
        undefined,
        [
          ...otherAisles.map((target) => ({
            text: target.name,
            onPress: () => executeAisleDelete(aisleId, target.id),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    }

    deleteWithCount();
  }

  function startAddStore() {
    setNewStoreName('');
    setAddStoreError(null);
    setAddingStore(true);
    setTimeout(() => storeInputRef.current?.focus(), 50);
  }

  async function commitAddStore() {
    const trimmed = newStoreName.trim();
    if (!trimmed) { setAddingStore(false); return; }
    if (stores.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setAddStoreError(`You already have a store called "${trimmed}".`);
      return;
    }
    const sortOrder = stores.length > 0 ? Math.max(...stores.map((s) => s.sort_order)) + 10 : 0;
    const { error } = await supabase.from('stores').insert({ household_id: householdId, name: trimmed, sort_order: sortOrder });
    if (error) { setAddStoreError(error.message); } else { setAddingStore(false); setNewStoreName(''); }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
        {stores.map((store) => (
          <StoreSection
            key={store.id}
            store={store}
            aisles={storeAisles[store.id] ?? []}
            allStores={stores}
            onStoreRename={handleStoreRename}
            onAisleAdd={handleAisleAdd}
            onAisleRename={handleAisleRename}
            onAisleReorder={handleAisleReorder}
            onAisleDeleteRequest={handleAisleDeleteRequest}
          />
        ))}

        <View style={styles.addStoreSection}>
          {stores.length < MAX_STORES ? (
            addingStore ? (
              <View style={styles.addStoreForm}>
                <TextInput
                  ref={storeInputRef}
                  style={styles.addStoreInput}
                  placeholder="Store name"
                  placeholderTextColor="#9ca3af"
                  value={newStoreName}
                  onChangeText={(t) => { setNewStoreName(t); setAddStoreError(null); }}
                  onSubmitEditing={commitAddStore}
                  returnKeyType="done"
                  accessibilityLabel="Store name"
                />
                <Pressable
                  onPress={commitAddStore}
                  style={styles.addStoreBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Add Store"
                >
                  <Text style={styles.addStoreBtnText}>Add Store</Text>
                </Pressable>
                {addStoreError !== null && <Text style={styles.error}>{addStoreError}</Text>}
              </View>
            ) : (
              <Pressable
                onPress={startAddStore}
                style={styles.addStoreRow}
                accessibilityRole="button"
                accessibilityLabel={`Add a store, ${stores.length} of ${MAX_STORES} used`}
              >
                <Text style={styles.addStoreText}>
                  {'+ Add a store '}
                  <Text style={styles.addStoreCount}>({stores.length} of {MAX_STORES} used)</Text>
                </Text>
              </Pressable>
            )
          ) : (
            // EC8-7: 3 stores reached
            <Text style={styles.limitText}>
              Maximum of 3 stores reached. Rename an existing store to switch.
            </Text>
          )}
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40, backgroundColor: '#f9fafb', flexGrow: 1 },
  addStoreSection: { marginTop: 4 },
  addStoreRow: { paddingVertical: 16 },
  addStoreText: { color: '#2563eb', fontSize: 16 },
  addStoreCount: { color: '#6b7280', fontSize: 14 },
  addStoreForm: { backgroundColor: '#fff', borderRadius: 10, padding: 16 },
  addStoreInput: {
    fontSize: 16,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    paddingVertical: 6,
    marginBottom: 14,
  },
  addStoreBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  addStoreBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: '#dc2626', fontSize: 13, marginTop: 10 },
  limitText: { color: '#6b7280', fontSize: 14, paddingVertical: 16 },
});
