import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';

import { StapleSection } from '@/components/StapleSection';
import { useHousehold } from '@/hooks/useHousehold';
import { useStapleItems } from '@/hooks/useStapleItems';
import type { StapleGroup, StapleItemWithDetails } from '@/types';

function buildStoreGroups(items: StapleItemWithDetails[], query: string): StapleGroup[] {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? items.filter((i) => i.name.toLowerCase().includes(normalized))
    : items;

  const map = new Map<string, StapleGroup>();

  for (const item of filtered) {
    const key = item.default_store_id ?? '__no_store__';
    if (!map.has(key)) {
      map.set(key, { store: item.store ?? null, items: [] });
    }
    map.get(key)!.items.push(item);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.store === null && b.store === null) return 0;
    if (a.store === null) return 1;
    if (b.store === null) return -1;
    return a.store.sort_order - b.store.sort_order;
  });
}

export default function StaplesScreen() {
  const { householdId } = useHousehold();
  const { items, loading } = useStapleItems(householdId);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildStoreGroups(items, searchQuery), [items, searchQuery]);

  function toggleSection(key: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleSearchClose() {
    setSearchVisible(false);
    setSearchQuery('');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Staples' }} />
        <View style={styles.centered}>
          <Text style={styles.emptyHeading}>No staples yet.</Text>
          <Text style={styles.emptySub}>
            Add your household's go-to items so you can quickly restock them.
          </Text>
          <Pressable
            style={styles.emptyAddBtn}
            accessibilityLabel="Add a staple"
            accessibilityRole="button"
          >
            <Text style={styles.emptyAddBtnLabel}>+ Add a Staple</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Staples',
          headerRight: () => (
            <Pressable
              hitSlop={12}
              accessibilityLabel="Add staple"
              accessibilityRole="button"
            >
              <Text style={styles.headerAddBtn}>＋</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.screen}>
        {searchVisible ? (
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              autoFocus
              placeholder="Search staples…"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search staples"
            />
            <Pressable onPress={handleSearchClose} hitSlop={8}>
              <Text style={styles.searchCancel}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.toolbar}>
            <Pressable
              onPress={() => setSearchVisible(true)}
              hitSlop={8}
              accessibilityLabel="Search staples"
              accessibilityRole="button"
            >
              <Text style={styles.toolbarSearchBtn}>Search 🔍</Text>
            </Pressable>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {groups.map((group) => {
            const key = group.store?.id ?? '__no_store__';
            return (
              <StapleSection
                key={key}
                group={group}
                isCollapsed={!searchVisible && collapsedKeys.has(key)}
                onToggle={() => toggleSection(key)}
              />
            );
          })}

          {groups.length === 0 && searchQuery.trim().length > 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                No staples match "{searchQuery.trim()}".
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 8 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyAddBtnLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerAddBtn: { fontSize: 22, color: '#2563eb', fontWeight: '400', marginRight: 4 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  toolbarSearchBtn: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
  },
  searchCancel: { fontSize: 15, color: '#2563eb' },
  noResults: { padding: 32, alignItems: 'center' },
  noResultsText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
