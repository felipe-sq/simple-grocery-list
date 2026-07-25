import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useThemeColors } from '@/hooks/useThemeColors';
import { flushGroceryMutations } from '@/lib/offlineQueue';
import { PresenceProvider } from '@/lib/PresenceProvider';

export default function AppLayout() {
  const colors = useThemeColors();
  const { isOnline } = useNetworkStatus();

  // Replay queued offline mutations app-wide: on entry to the app and on
  // every reconnect. Without this, check-offs made offline in a list only
  // sync once that list's detail screen is reopened, and My Lists counts
  // stay stale against the server.
  useEffect(() => {
    if (isOnline) {
      void flushGroceryMutations();
    }
  }, [isOnline]);

  return (
    <PresenceProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </PresenceProvider>
  );
}
