import { publishAlert, type AlertButton } from '@/lib/alertBus';

export type { AlertButton };

/**
 * Web implementation of the cross-platform `alert()` helper.
 *
 * react-native-web's own Alert.alert is a no-op stub (it does nothing at
 * all), so every Alert.alert(...) call in this app was silently swallowed
 * on web — no message, no confirm, nothing. This restores real behavior:
 *
 *  - 0-1 buttons: window.alert(). Blocking native browser dialog, identical
 *    behavior on desktop and mobile web (it's OS/browser chrome, not our UI).
 *  - Exactly 2 buttons with one styled 'cancel': window.confirm(), mapped to
 *    the matching button's onPress. Same reasoning — native dialog, no
 *    layout code of our own to get wrong on any viewport size.
 *  - 3+ buttons (action-sheet style pickers, e.g. "choose an aisle" or
 *    "select all in X / select all / cancel"): window.confirm can only ever
 *    offer two choices, so these are handed off to AlertHost, a small
 *    responsive modal mounted at the root layout that renders one row per
 *    button and works the same way regardless of viewport width.
 */
export function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  const resolvedButtons: AlertButton[] = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  const combined = message ? `${title}\n\n${message}` : title;

  if (resolvedButtons.length === 1) {
    window.alert(combined);
    resolvedButtons[0].onPress?.();
    return;
  }

  const cancelIndex = resolvedButtons.findIndex((b) => b.style === 'cancel');
  if (resolvedButtons.length === 2 && cancelIndex !== -1) {
    const confirmButton = resolvedButtons[1 - cancelIndex];
    const cancelButton = resolvedButtons[cancelIndex];
    if (window.confirm(combined)) {
      confirmButton.onPress?.();
    } else {
      cancelButton.onPress?.();
    }
    return;
  }

  publishAlert({ title, message, buttons: resolvedButtons });
}
