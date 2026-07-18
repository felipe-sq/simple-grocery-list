import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { setAlertListener, type AlertRequest } from '@/lib/alertBus';

/**
 * Renders web-only action-sheet style alerts (3+ buttons — see
 * lib/alert.web.ts for why those can't just be window.confirm()). Mount once
 * near the root of the app. No-op until something publishes a request.
 *
 * Layout mirrors SheetModal's existing overlay/backdrop pattern so it looks
 * native to this app. Sizing is percentage + max-width based (no separate
 * mobile vs. desktop code paths), so it's the same component at any
 * viewport — a narrow phone gets a near-full-width box, a wide desktop
 * browser gets the same box capped at 400px and centered.
 */
export function AlertHost() {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    setAlertListener(setRequest);
    return () => setAlertListener(null);
  }, []);

  if (!request) return null;

  function dismiss(onPress?: () => void) {
    setRequest(null);
    onPress?.();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismiss()}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={() => dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View style={styles.box}>
          <Text style={styles.title}>{request.title}</Text>
          {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
          <View style={styles.buttons}>
            {request.buttons.map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                style={[styles.button, button.style === 'cancel' && styles.buttonCancel]}
                onPress={() => dismiss(button.onPress)}
                accessibilityRole="button"
                accessibilityLabel={button.text}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'destructive' && styles.buttonTextDestructive,
                    button.style === 'cancel' && styles.buttonTextCancel,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  box: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    gap: 8,
  },
  button: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f9fafb',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  buttonTextDestructive: {
    color: '#dc2626',
  },
  buttonTextCancel: {
    color: '#374151',
  },
});
