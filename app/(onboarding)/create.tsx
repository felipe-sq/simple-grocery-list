import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function CreateHousehold() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const router = useRouter();

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for your household.');
      return;
    }
    if (!session) return;

    setLoading(true);

    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name: name.trim() })
      .select('id')
      .single();
    const householdRow = household as { id: string } | null;

    if (householdError || !householdRow) {
      setLoading(false);
      Alert.alert('Error', 'Failed to create household. Please try again.');
      return;
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: householdRow.id, user_id: session.user.id });

    if (memberError) {
      setLoading(false);
      Alert.alert('Error', 'Failed to join household. Please try again.');
      return;
    }

    setLoading(false);
    router.replace('/(app)');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Give your household a name (e.g., "The Smiths" or "Home").
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Household name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!loading}
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Create Household'}</Text>
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
  description: {
    fontSize: 15,
    color: '#6b7280',
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
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
