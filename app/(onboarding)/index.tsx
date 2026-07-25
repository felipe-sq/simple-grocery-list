import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';

export default function OnboardingIndex() {
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      justifyContent: 'center' as const,
      padding: 32,
      backgroundColor: c.background,
    },
    title: {
      fontSize: 32,
      fontWeight: '700' as const,
      marginBottom: 12,
      textAlign: 'center' as const,
      color: c.foreground,
    },
    subtitle: {
      fontSize: 15,
      color: c.mutedForeground,
      textAlign: 'center' as const,
      marginBottom: 40,
      lineHeight: 22,
    },
    primaryButton: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 15,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    primaryButtonText: {
      color: c.primaryForeground,
      fontWeight: '600' as const,
      fontSize: 16,
    },
    secondaryButton: {
      borderWidth: 1.5,
      borderColor: c.primary,
      borderRadius: 10,
      padding: 15,
      alignItems: 'center' as const,
    },
    secondaryButtonText: {
      color: c.primary,
      fontWeight: '600' as const,
      fontSize: 16,
    },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>
        You are not part of a household yet. Create one or join with an invite link.
      </Text>

      <Link href="/(onboarding)/create" asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Create a Household</Text>
        </Pressable>
      </Link>

      <Link href="/(onboarding)/join" asChild>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Join with Invite Link</Text>
        </Pressable>
      </Link>
    </View>
  );
}
