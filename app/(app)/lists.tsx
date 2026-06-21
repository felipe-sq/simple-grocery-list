import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StoreView } from '@/components/StoreView';
import { useStores } from '@/hooks/useStores';
import { storage } from '@/lib/storage';

const LAST_STORE_KEY = 'lastActiveStoreId';

export default function ListsScreen() {
  const { stores, loading } = useStores();
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (loading || initialized) return;
    if (stores.length === 0) {
      setInitialized(true);
      return;
    }
    storage.getItem(LAST_STORE_KEY).then((id) => {
      const valid = id !== null && stores.some((s) => s.id === id);
      setActiveStoreId(valid ? id : stores[0].id);
      setInitialized(true);
    });
  }, [stores, loading, initialized]);

  function handleSelectStore(storeId: string) {
    setActiveStoreId(storeId);
    void storage.setItem(LAST_STORE_KEY, storeId);
  }

  if (loading || !initialized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (stores.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No lists yet. Add one in Settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.chipBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipBar}
        >
          {stores.map((store) => {
            const isActive = store.id === activeStoreId;
            const accentColor = store.color ?? '#2563eb';
            return (
              <Pressable
                key={store.id}
                onPress={() => handleSelectStore(store.id)}
                style={[styles.chip, isActive && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={store.name}
              >
                <Text style={[styles.chipLabel, isActive && { color: accentColor, fontWeight: '700' }]}>
                  {store.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {activeStoreId !== null && (
        <StoreView key={activeStoreId} storeId={activeStoreId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  chipBarWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  chipBar: {
    paddingHorizontal: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
});
