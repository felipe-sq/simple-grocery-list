import { Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Grocery Lists</Text>
      <Text style={styles.subtext}>Stores and lists coming in the next tickets.</Text>
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
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
  signOutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
