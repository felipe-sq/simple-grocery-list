import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { session } = useAuth();
  const { householdId } = useHousehold();
  const router = useRouter();
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from('households')
      .select('name')
      .eq('id', householdId)
      .single()
      .then(({ data }) => {
        const row = data as { name: string } | null;
        if (row) setHouseholdName(row.name);
      });
  }, [householdId]);

  async function handleGenerateInvite() {
    if (!householdId || !session) return;
    setGenerating(true);

    // Generate a cryptographically random token.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from('household_invites').insert({
      household_id: householdId,
      token,
      created_by: session.user.id,
    });

    setGenerating(false);

    if (error) {
      Alert.alert('Error', 'Failed to generate invite link. Please try again.');
      return;
    }

    const url = Linking.createURL('join', { queryParams: { token } });
    await Clipboard.setStringAsync(url);
    Alert.alert(
      'Link copied!',
      `Invite link copied to clipboard. Share it with a household member.\n\n${url}`,
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      {householdName !== null && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOUSEHOLD</Text>
          <Text style={styles.householdName}>{householdName}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>INVITE</Text>
        <Text style={styles.description}>
          Generate a single-use invite link valid for 48 hours. Anyone with the link can join your
          household.
        </Text>
        <Pressable
          style={[styles.button, generating && styles.buttonDisabled]}
          onPress={handleGenerateInvite}
          disabled={generating}
          accessibilityRole="button"
          accessibilityLabel={generating ? 'Generating invite link' : 'Generate Invite Link'}
          accessibilityState={{ disabled: generating }}
        >
          <Text style={styles.buttonText}>
            {generating ? 'Generating…' : 'Generate Invite Link'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>STORES & AISLES</Text>
        <Text style={styles.description}>
          Configure your stores and aisles for your grocery lists.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => router.push('/(app)/settings/stores')}
          accessibilityRole="button"
          accessibilityLabel="Manage Stores and Aisles"
        >
          <Text style={styles.buttonText}>Manage Stores & Aisles</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Pressable
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign Out"
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  householdName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  signOutButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
  },
  signOutText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 15,
  },
});
