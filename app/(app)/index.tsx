import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useStores } from '@/hooks/useStores';

export default function AppIndex() {
  const { stores, loading } = useStores();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (stores.length > 0) {
      router.replace({ pathname: '/store/[storeId]', params: { storeId: stores[0].id } });
    } else {
      router.replace('/(app)/settings/stores');
    }
  }, [stores, loading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
});
