import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  return <RootLayoutNav fontsLoaded={fontsLoaded} />;
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!fontsLoaded || loading) return;
    SplashScreen.hideAsync();
  }, [fontsLoaded, loading]);

  useEffect(() => {
    if (!fontsLoaded || loading) return;

    if (session) {
      const defaultName = session.user.email?.split('@')[0] ?? 'User';
      supabase
        .from('profiles')
        .upsert({ id: session.user.id, name: defaultName }, { onConflict: 'id', ignoreDuplicates: true });
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && !inAppGroup) {
      router.replace('/(app)/');
    }
  }, [fontsLoaded, loading, session, segments]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}
