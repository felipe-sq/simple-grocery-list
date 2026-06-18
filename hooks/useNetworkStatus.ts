import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!mountedRef.current) return;
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  return { isOnline };
}
