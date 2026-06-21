import { useLocalSearchParams } from 'expo-router';

import { StoreView } from '@/components/StoreView';

export default function StoreScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  return <StoreView storeId={storeId} />;
}
