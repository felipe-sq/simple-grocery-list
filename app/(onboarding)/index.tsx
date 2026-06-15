import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function OnboardingIndex() {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 16,
  },
});
