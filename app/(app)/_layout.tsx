import { usePathname, useRouter } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStores } from '@/hooks/useStores';

export default function AppLayout() {
  const { stores, loading } = useStores();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Tabs>
      <View style={styles.content}>
        {loading && (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          </View>
        )}
        <TabSlot />
      </View>

      <TabList style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {stores.map((store) => (
          <TabTrigger
            key={store.id}
            name={store.id}
            href={`/store/${store.id}`}
            style={styles.tabItem}
          >
            <Text
              style={[styles.tabLabel, pathname === `/store/${store.id}` && styles.tabLabelActive]}
              numberOfLines={1}
            >
              {store.name}
            </Text>
          </TabTrigger>
        ))}

        <TabTrigger name="suggestions" href="/suggestions" style={styles.tabItem}>
          <Text
            style={[styles.tabLabel, pathname === '/suggestions' && styles.tabLabelActive]}
          >
            Suggestions
          </Text>
        </TabTrigger>

        <TabTrigger name="staples" href="/staples" style={styles.tabItem}>
          <Text style={[styles.tabLabel, pathname === '/staples' && styles.tabLabelActive]}>
            Staples
          </Text>
        </TabTrigger>

        <Pressable
          style={styles.tabItem}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.tabLabel,
              pathname.startsWith('/settings') && styles.tabLabelActive,
            ]}
          >
            ⚙
          </Text>
        </Pressable>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
