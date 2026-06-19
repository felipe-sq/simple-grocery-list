import type { Session } from '@supabase/supabase-js';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { usePathname } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePresence } from '@/hooks/usePresence';
import { useStores } from '@/hooks/useStores';
import { flush } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';

const STORE_ROUTE_RE = /^\/store\/(.+)$/;

const NON_GROCERY_TYPES = ['add_staple', 'dismiss_suggestion'] as const;

function getDisplayName(session: Session): string {
  const meta = session.user.user_metadata;
  return (meta?.full_name as string | undefined)
    ?? (meta?.name as string | undefined)
    ?? session.user.email?.split('@')[0]
    ?? 'Someone';
}

export default function AppLayout() {
  const { stores, loading } = useStores();
  const { session } = useAuth();
  const { householdId } = useHousehold();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isOnline } = useNetworkStatus();

  const userId = session?.user.id ?? null;
  const userName = session ? getDisplayName(session) : '';
  const activeStoreId = STORE_ROUTE_RE.exec(pathname)?.[1] ?? null;

  const presenceByStore = usePresence(householdId, userId, userName, activeStoreId);

  // Flush non-grocery mutations (add_staple, dismiss_suggestion) on reconnect
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (!wasOnlineRef.current && isOnline) {
      flush(async (mutation) => {
        if (mutation.type === 'add_staple') {
          const { error } = await supabase.from('staple_items').insert(mutation.staple);
          return !error;
        }
        if (mutation.type === 'dismiss_suggestion') {
          await supabase.from('suggestion_dismissals').insert(mutation.dismissal);
          return true;
        }
        return false;
      }, NON_GROCERY_TYPES);
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  return (
    <BottomSheetModalProvider>
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
        {stores.map((store) => {
          const present = presenceByStore.get(store.id) ?? [];
          return (
            <TabTrigger
              key={store.id}
              name={store.id}
              href={`/store/${store.id}`}
              style={styles.tabItem}
            >
              <View style={styles.tabLabelRow}>
                <Text
                  style={[styles.tabLabel, pathname === `/store/${store.id}` && styles.tabLabelActive]}
                  numberOfLines={1}
                >
                  {store.name}
                </Text>
                {!isOnline && (
                  <View style={styles.offlineBadge}>
                    <Text style={styles.offlineBadgeText}>Offline</Text>
                  </View>
                )}
              </View>
              {present.length > 0 && (
                <Text style={styles.presenceLabel} numberOfLines={1}>
                  {present.join(', ')}
                </Text>
              )}
            </TabTrigger>
          );
        })}

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

        <TabTrigger name="settings" href="/settings" style={styles.tabItem}>
          <Text
            style={[
              styles.tabLabel,
              pathname.startsWith('/settings') && styles.tabLabelActive,
            ]}
          >
            ⚙
          </Text>
        </TabTrigger>
      </TabList>
    </Tabs>
    </BottomSheetModalProvider>
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
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  offlineBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  offlineBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  presenceLabel: {
    fontSize: 9,
    color: '#10b981',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
});
