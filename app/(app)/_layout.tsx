import type { Session } from '@supabase/supabase-js';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const router = useRouter();

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
    <View style={styles.root}>
      <View style={styles.content}>
        {loading && (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          </View>
        )}
        <Slot />
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {stores.map((store) => {
          const storeHref = `/store/${store.id}`;
          const present = presenceByStore.get(store.id) ?? [];
          return (
            <Pressable
              key={store.id}
              onPress={() => router.push({ pathname: '/store/[storeId]', params: { storeId: store.id } })}
              style={styles.tabItem}
              accessibilityRole="tab"
            >
              <View style={styles.tabLabelRow}>
                {store.color !== null && (
                  <View style={[styles.storeDot, { backgroundColor: store.color }]} />
                )}
                <Text
                  style={[styles.tabLabel, pathname === storeHref && styles.tabLabelActive]}
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
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.push('/staples')}
          style={styles.tabItem}
          accessibilityRole="tab"
        >
          <Text style={[styles.tabLabel, pathname === '/staples' && styles.tabLabelActive]}>
            Staples
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/settings')}
          style={styles.tabItem}
          accessibilityRole="tab"
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  storeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
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
