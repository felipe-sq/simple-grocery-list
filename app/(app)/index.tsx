import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Grocery Lists</Text>
      <Text style={styles.subtext}>Stores and lists coming in the next tickets.</Text>

      <Link href="/(app)/settings" asChild>
        <Pressable style={styles.settingsButton}>
          <Text style={styles.settingsText}>Settings</Text>
        </Pressable>
      </Link>
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
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  settingsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  settingsText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 15,
  },
});
