import { Alert } from 'react-native';

import type { AlertButton } from '@/lib/alertBus';

export type { AlertButton };

/**
 * Cross-platform alert. On iOS/Android this is a thin pass-through to the
 * real RN Alert.alert. Web has its own implementation (alert.web.ts) because
 * react-native-web's Alert.alert is a no-op stub — see that file for details.
 */
export function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  Alert.alert(title, message, buttons);
}
