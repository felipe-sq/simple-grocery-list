import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';

type Stage = 'verifying' | 'form' | 'success' | 'error';

export default function ResetPassword() {
  const { token_hash, type } = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!token_hash || type !== 'recovery') {
      queueMicrotask(() => {
        setErrorMsg('Invalid or missing reset link. Please request a new one.');
        setStage('error');
      });
      return;
    }
    supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error }) => {
      if (error) {
        setErrorMsg(error.message);
        setStage('error');
      } else {
        setStage('form');
      }
    });
  }, [token_hash, type]);

  async function handleSave() {
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setValidationError('Passwords do not match.');
      return;
    }
    setValidationError(null);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setValidationError(error.message);
    } else {
      await supabase.auth.signOut();
      setStage('success');
    }
  }

  if (stage === 'verifying') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.body}>Verifying reset link…</Text>
      </View>
    );
  }

  if (stage === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Link expired</Text>
        <Text style={styles.body}>{errorMsg}</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/sign-in')} accessibilityRole="button" accessibilityLabel="Back to sign in">
          <Text style={styles.buttonText}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === 'success') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Password updated</Text>
        <Text style={styles.body}>Your password has been changed. Sign in with your new password.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/sign-in')} accessibilityRole="button" accessibilityLabel="Sign in">
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New password</Text>
      <Text style={styles.body}>Choose a new password for your account.</Text>
      <TextInput
        style={styles.input}
        placeholder="New password"
        value={password}
        onChangeText={(t) => { setPassword(t); setValidationError(null); }}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        editable={!saving}
        accessibilityLabel="New password"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        value={confirm}
        onChangeText={(t) => { setConfirm(t); setValidationError(null); }}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        editable={!saving}
        accessibilityLabel="Confirm new password"
      />
      {validationError !== null && <Text style={styles.errorText}>{validationError}</Text>}
      <Pressable
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={saving ? 'Saving password' : 'Save new password'}
        accessibilityState={{ disabled: saving }}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save new password'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
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
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  errorText: { fontSize: 13, color: '#dc2626', marginBottom: 12 },
});
