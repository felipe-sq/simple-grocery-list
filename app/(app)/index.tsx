import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListCard } from '@/components/ListCard';
import { ListFormModal } from '@/components/ListFormModal';
import { useHousehold } from '@/hooks/useHousehold';
import { useListCounts } from '@/hooks/useListCounts';
import { useLists } from '@/hooks/useLists';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePresenceContext } from '@/lib/PresenceProvider';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { alert } from '@/lib/alert';
import type { List } from '@/types';

export default function MyListsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { householdId } = useHousehold();
  const { lists, loading, createList, updateList, deleteList } = useLists();
  const counts = useListCounts(householdId);
  const { isOnline } = useNetworkStatus();
  const { presenceByList } = usePresenceContext();

  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<List | null>(null);

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5, color: c.foreground },
    headerActions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingBottom: 2 },
    headerBtn: { padding: 4 },
    offlineBadge: {
      backgroundColor: '#f59e0b',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 4,
    },
    offlineBadgeText: { fontSize: 10, fontWeight: '700' as const, color: '#fff' },
    loadingCenter: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
    listContent: { paddingHorizontal: 16, paddingTop: 8 },
    separator: { height: 8 },
    empty: { alignItems: 'center' as const, paddingTop: 80, paddingHorizontal: 32, gap: 12 },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 8,
      backgroundColor: c.muted,
    },
    emptyTitle: { fontSize: 20, fontWeight: '600' as const, color: c.foreground },
    emptySub: { fontSize: 15, textAlign: 'center' as const, lineHeight: 22, color: c.mutedForeground },
  }));

  const confirmDelete = useCallback(
    (list: List) => {
      alert(
        `Delete "${list.name}"?`,
        'This will permanently delete the list and every item in it. This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Forever',
            style: 'destructive',
            onPress: () => {
              void deleteList(list.id);
            },
          },
        ],
      );
    },
    [deleteList],
  );

  const handleLongPress = useCallback(
    (list: List) => {
      alert(list.name, undefined, [
        { text: 'Edit List', onPress: () => setEditTarget(list) },
        { text: 'Delete List', style: 'destructive', onPress: () => confirmDelete(list) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [confirmDelete],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>My Lists</Text>
        <View style={styles.headerActions}>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings')}
            hitSlop={10}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowNew(true)}
            hitSlop={10}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="New list"
          >
            <Ionicons name="add-circle" size={30} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => {
            const count = counts.get(item.id) ?? { total: 0, remaining: 0 };
            return (
              <ListCard
                list={item}
                totalCount={count.total}
                remainingCount={count.remaining}
                presentNames={presenceByList.get(item.id)}
                onPress={() => router.push(`/(app)/list/${item.id}`)}
                onLongPress={() => handleLongPress(item)}
              />
            );
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cart-outline" size={40} color={colors.mutedForeground} />
              </View>
              <Text style={styles.emptyTitle}>No lists yet</Text>
              <Text style={styles.emptySub}>Tap + to create your first grocery list</Text>
            </View>
          }
        />
      )}

      <ListFormModal
        visible={showNew}
        onClose={() => setShowNew(false)}
        onSubmit={async (name, color, icon) => {
          const { error } = await createList(name, color, icon);
          return error;
        }}
      />

      <ListFormModal
        visible={editTarget !== null}
        list={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={async (name, color, icon) => {
          if (!editTarget) return null;
          return updateList(editTarget.id, { name, color, icon });
        }}
      />
    </View>
  );
}
