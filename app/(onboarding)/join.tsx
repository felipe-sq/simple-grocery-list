import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { alert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

export const PENDING_JOIN_TOKEN_KEY = 'pendingJoinToken';

export default function JoinHousehold() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const initialToken = Array.isArray(tokenParam) ? (tokenParam[0] ?? '') : (tokenParam ?? '');
  const [input, setInput] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  // Handle unauthenticated deep-link with no token: redirect to sign-in.
  useEffect(() => {
    if (authLoading) return;
    if (session) return;
    const rawInput = (
      Array.isArray(tokenParam) ? (tokenParam[0] ?? '') : (tokenParam ?? '')
    ).trim();
    if (!rawInput) {
      router.replace('/(auth)/sign-in');
    }
  }, [session, authLoading, tokenParam, router]);

  async function saveTokenAndNavigate(destination: '/(auth)/sign-in' | '/(auth)/sign-up') {
    const rawInput = (
      Array.isArray(tokenParam) ? (tokenParam[0] ?? '') : (tokenParam ?? '')
    ).trim();
    if (rawInput) {
      await AsyncStorage.setItem(PENDING_JOIN_TOKEN_KEY, rawInput);
    }
    router.replace(destination);
  }

  async function handleJoin() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Please paste your invite link or token.');
      return;
    }
    if (!session) {
      alert('Not signed in', 'Please sign in before joining a household.');
      return;
    }

    setError(null);

    // Extract token from a full URL (any scheme) or use the raw token string.
    let token = trimmed;
    const tokenMatch = trimmed.match(/[?&]token=([^&#]+)/);
    if (tokenMatch?.[1]) {
      token = decodeURIComponent(tokenMatch[1]);
    }

    setLoading(true);
    try {
      await doJoin(token, session);
    } catch {
      setLoading(false);
      setError('Something went wrong. Please try again.');
    }
  }

  async function doJoin(token: string, activeSession: NonNullable<typeof session>) {
    // Ensure the profile row exists — household_members has a FK to profiles(id)
    // and the upsert in the root layout is fire-and-forget (may not have settled yet).
    await supabase.from('profiles').upsert(
      { id: activeSession.user.id, name: activeSession.user.email?.split('@')[0] ?? 'User' },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    const { data: inviteData, error: fetchError } = await supabase
      .from('household_invites')
      .select('id, household_id, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();
    const invite = inviteData as {
      id: string;
      household_id: string;
      expires_at: string;
      used_at: string | null;
    } | null;

    if (fetchError || !invite) {
      setLoading(false);
      setError('This invite link is invalid. Please check and try again.');
      return;
    }

    if (invite.used_at) {
      setLoading(false);
      setError('This invite link has already been used. Ask for a new one.');
      return;
    }

    if (new Date(invite.expires_at) < new Date()) {
      setLoading(false);
      setError('This invite link has expired. Ask a household member to generate a new one.');
      return;
    }

    const { error: joinError } = await supabase
      .from('household_members')
      .insert({ household_id: invite.household_id, user_id: activeSession.user.id });

    if (joinError) {
      setLoading(false);
      if (joinError.code === '23505') {
        // Already a member — navigate to the app without error.
        router.replace('/(app)');
        return;
      }
      setError('Failed to join household. Please try again.');
      return;
    }

    // Mark invite as used.
    await supabase
      .from('household_invites')
      .update({ used_at: new Date().toISOString(), used_by: activeSession.user.id })
      .eq('id', invite.id);

    setLoading(false);
    router.replace('/(app)');
  }

  if (authLoading) return null;

  if (!session) {
    const hasToken = (
      Array.isArray(tokenParam) ? (tokenParam[0] ?? '') : (tokenParam ?? '')
    ).trim().length > 0;
    if (!hasToken) return null;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>You've been invited</Text>
        <Text style={styles.description}>
          Sign in to an existing account or create a new one to join the household.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => saveTokenAndNavigate('/(auth)/sign-up')}
          accessibilityRole="button"
          accessibilityLabel="Create a new account"
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </Pressable>
        <Pressable
          style={styles.buttonSecondary}
          onPress={() => saveTokenAndNavigate('/(auth)/sign-in')}
          accessibilityRole="button"
          accessibilityLabel="Sign in to existing account"
        >
          <Text style={styles.buttonSecondaryText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Paste the invite link (or just the token) shared by a household member.
      </Text>

      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Paste invite link or token"
        value={input}
        onChangeText={(text) => {
          setInput(text);
          if (error) setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        numberOfLines={3}
        editable={!loading}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Joining…' : 'Join Household'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondary: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 16,
  },
});
