import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuthStyles } from '@/hooks/useAuthStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { alert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'forgot' | 'sent';

export default function SignIn() {
  const styles = useAuthStyles();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('signin');

  async function handleSignIn() {
    if (!email.trim() || !password) {
      alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) alert('Sign in failed', error.message);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      alert('Email required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    const redirectTo = Linking.createURL('reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) {
      alert('Error', error.message);
    } else {
      setMode('sent');
    }
  }

  if (mode === 'sent') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>
          We sent a password reset link to {email.trim()}. Follow the link to set a new password.
        </Text>
        <Pressable style={styles.button} onPress={() => setMode('signin')} accessibilityRole="button" accessibilityLabel="Back to sign in">
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (mode === 'forgot') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.body}>Enter your email and we'll send you a reset link.</Text>
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
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleForgotPassword}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={loading ? 'Sending reset link' : 'Send reset link'}
          accessibilityState={{ disabled: loading }}
        >
          <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send reset link'}</Text>
        </Pressable>
        <Pressable onPress={() => setMode('signin')} style={styles.linkBtn} accessibilityRole="button" accessibilityLabel="Back to sign in">
          <Text style={styles.link}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
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
        placeholder="Password"
        placeholderTextColor={colors.mutedForeground}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        editable={!loading}
        accessibilityLabel="Password"
      />
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Signing in' : 'Sign In'}
        accessibilityState={{ disabled: loading }}
      >
        <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </Pressable>
      <Pressable onPress={() => setMode('forgot')} style={styles.linkBtn} accessibilityRole="button" accessibilityLabel="Forgot password">
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" style={styles.link}>
        Don't have an account? Sign up
      </Link>
    </View>
  );
}

