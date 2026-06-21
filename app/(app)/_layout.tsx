import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { flush } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';

const NON_GROCERY_TYPES = ['add_staple', 'dismiss_suggestion'] as const;

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isOnline } = useNetworkStatus();
  const router = useRouter();

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

  const listsActive = pathname === '/lists' || pathname.startsWith('/store/');
  const staplesActive = pathname === '/staples';
  const settingsActive = pathname.startsWith('/settings');

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        <Pressable
          onPress={() => router.push('/lists')}
          style={[styles.tabItem, listsActive && styles.tabItemActive]}
          accessibilityRole="tab"
          accessibilityLabel="Lists"
          accessibilityState={{ selected: listsActive }}
        >
          <View style={styles.tabLabelRow}>
            <Text style={[styles.tabLabel, listsActive && styles.tabLabelActive]}>
              Lists
            </Text>
            {!isOnline && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>Offline</Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/staples')}
          style={[styles.tabItem, staplesActive && styles.tabItemActive]}
          accessibilityRole="tab"
          accessibilityLabel="Staples"
          accessibilityState={{ selected: staplesActive }}
        >
          <Text style={[styles.tabLabel, staplesActive && styles.tabLabelActive]}>
            Staples
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/settings')}
          style={[styles.tabItem, settingsActive && styles.tabItemActive]}
          accessibilityRole="tab"
          accessibilityLabel="Settings"
          accessibilityState={{ selected: settingsActive }}
        >
          <Text style={[styles.tabLabel, settingsActive && styles.tabLabelActive]}>
            ⚙
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 4,
    minWidth: 0,
    borderTopWidth: 3,
    borderTopColor: 'transparent',
  },
  tabItemActive: {
    borderTopColor: '#f59e0b',
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
    fontWeight: '700',
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
});
