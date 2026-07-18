// Tiny pub/sub bridge used only on web. `alert.web.ts` publishes action-sheet
// style requests (3+ buttons — something window.confirm can't represent) and
// `components/AlertHost.tsx`, mounted once at the root layout, subscribes and
// renders them. Native platforms never touch this file (alert.ts calls the
// real RN Alert.alert directly).

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AlertRequest = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type Listener = (request: AlertRequest) => void;

let listener: Listener | null = null;

export function setAlertListener(fn: Listener | null): void {
  listener = fn;
}

export function publishAlert(request: AlertRequest): void {
  if (listener) {
    listener(request);
    return;
  }
  // Should only happen if an alert fires before the root layout has mounted.
  // eslint-disable-next-line no-console
  console.warn('[alert] AlertHost not mounted yet — dropped alert:', request.title);
}
