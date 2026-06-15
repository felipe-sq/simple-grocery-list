import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ headerShown: true, title: 'Create Household' }} />
      <Stack.Screen name="join" options={{ headerShown: true, title: 'Join Household' }} />
    </Stack>
  );
}
