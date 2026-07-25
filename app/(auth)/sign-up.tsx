import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuthStyles } from '@/hooks/useAuthStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { alert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const styles = useAuthStyles();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email.trim() || !password) {
      alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      alert('Sign up failed', error.message);
      return;
    }
    if (!data.session) {
      // Email confirmation is required — session arrives after the user confirms.
      setLoading(false);
      alert('Check your email', `We sent a confirmation link to ${email.trim()}.`);
      return;
    }
    // Session returned immediately (email confirmation disabled in Supabase dashboard).
    // Profile upsert is handled by the root layout's onAuthStateChange effect.
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.mutedForeground}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!loading}
        accessibilityLabel="Email"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        placeholderTextColor={colors.mutedForeground}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!loading}
        accessibilityLabel="Password, minimum 6 characters"
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Creating account' : 'Create Account'}
        accessibilityState={{ disabled: loading }}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
      </Pressable>

      <Link href="/(auth)/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </View>
  );
}

