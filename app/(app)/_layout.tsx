import { Stack } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PresenceProvider } from '@/lib/PresenceProvider';

export default function AppLayout() {
  const colors = useThemeColors();
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
