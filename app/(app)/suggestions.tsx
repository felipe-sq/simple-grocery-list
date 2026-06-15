import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStores } from '@/hooks/useStores';

export default function SuggestionsScreen() {
  const { stores, loading } = useStores();
  const router = useRouter();

  if (!loading && stores.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🏪</Text>
        <Text style={styles.heading}>No stores configured</Text>
        <Text style={styles.body}>
          Add at least one store before using the app. Tap below to set up your stores and aisles.
        </Text>
        <Pressable style={styles.button} onPress={() => router.push('/settings/stores')}>
          <Text style={styles.buttonText}>Set up Stores & Aisles</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💡</Text>
      <Text style={styles.heading}>Suggestions</Text>
      <Text style={styles.body}>
        Smart restocking suggestions will appear here once you have some shopping history.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
