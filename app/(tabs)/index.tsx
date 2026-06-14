import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';

export default function TabOneScreen() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    supabase
      .from('_smoke_test')
      .select('*')
      .limit(1)
      .then(({ data, error }) => {
        console.log('[Supabase smoke test]', { data, error });
        // A "relation does not exist" error still means connectivity is working.
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          setStatus('Connected (table not found — expected)');
        } else if (error) {
          setStatus(`Error: ${error.message}`);
        } else {
          setStatus('Connected');
        }
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text style={styles.status}>{status}</Text>
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  status: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },
});
