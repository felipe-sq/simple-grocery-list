import 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { HouseholdProvider } from '@/lib/HouseholdProvider';
import { PENDING_JOIN_TOKEN_KEY } from '@/app/(onboarding)/join';
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

  return (
    <HouseholdProvider>
      <RootLayoutNav fontsLoaded={fontsLoaded} />
    </HouseholdProvider>
  );
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, loading: authLoading } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  const segments = useSegments();
  const router = useRouter();

  const loading = !fontsLoaded || authLoading || householdLoading;

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
  }, [loading]);

  // Upsert profile row on login. Idempotent so safe to run on token refresh too.
  useEffect(() => {
    if (!session) return;
    const defaultName = session.user.email?.split('@')[0] ?? 'User';
    supabase
      .from('profiles')
      .upsert({ id: session.user.id, name: defaultName }, { onConflict: 'id', ignoreDuplicates: true });
  }, [session]);

  // After login, replay any join token saved before authentication.
  useEffect(() => {
    if (!session) return;
    AsyncStorage.getItem(PENDING_JOIN_TOKEN_KEY).then((pendingToken) => {
      if (!pendingToken) return;
      AsyncStorage.removeItem(PENDING_JOIN_TOKEN_KEY);
      router.replace({
        pathname: '/(onboarding)/join',
        params: { token: pendingToken },
      });
    });
  }, [session, router]);

  // Listen for deep links while the app is running.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      const token = parsed.queryParams?.token;
      if (typeof token !== 'string' || !token) return;
      if (session) {
        router.push({
          pathname: '/(onboarding)/join',
          params: { token },
        });
      } else {
        AsyncStorage.setItem(PENDING_JOIN_TOKEN_KEY, token);
      }
    });
    return () => sub.remove();
  }, [session, router]);

  // Route guard: runs after all loading is resolved.
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inAppGroup = segments[0] === '(app)';

    if (!session && !inAuthGroup && !inOnboardingGroup) {
      // Unauthenticated user at an unexpected location — go to sign-in.
      router.replace('/(auth)/sign-in');
    } else if (session && !householdId && !inOnboardingGroup && !inAppGroup) {
      // Authenticated but no household yet — show onboarding.
      router.replace('/(onboarding)');
    } else if (session && householdId && !inAppGroup) {
      // Authenticated with a household and not in the main app — go there.
      router.replace('/(app)');
    }
  }, [loading, session, householdId, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}
