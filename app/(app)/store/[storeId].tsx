import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function StoreScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🛒</Text>
      <Text style={styles.heading}>Coming soon</Text>
      <Text style={styles.sub}>Grocery list for this store will appear here.</Text>
      <Text style={styles.storeId} numberOfLines={1}>
        Store ID: {storeId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  storeId: {
    fontSize: 11,
    color: '#d1d5db',
    fontFamily: 'monospace',
  },
});
