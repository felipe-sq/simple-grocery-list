import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { GroceryItemWithAisle } from '@/types';

type Props = {
  visible: boolean;
  storeName: string;
  items: GroceryItemWithAisle[];
  onConfirm: () => Promise<{ error: string | null; raceLost: boolean }>;
  onClose: () => void;
};

export function EndTripModal({ visible, storeName, items, onConfirm, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [raceNotice, setRaceNotice] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const initialCheckedIdsRef = useRef<Set<string>>(new Set());
  const confirmingRef = useRef(false);

  const checkedItems = items.filter((i) => i.checked);
  const uncheckedItems = items.filter((i) => !i.checked);

  // Capture initial checked IDs when modal opens (ref update only — no setState)
  useEffect(() => {
    if (visible) {
      initialCheckedIdsRef.current = new Set(
        items.filter((i) => i.checked).map((i) => i.id),
      );
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // EC5-4: detect when another member ends the trip while modal is open.
  // setState is deferred via setTimeout so it runs in a callback, not synchronously
  // in the effect body (avoids react-hooks/set-state-in-effect lint rule).
  useEffect(() => {
    if (!visible || confirmingRef.current) return;
    const initial = initialCheckedIdsRef.current;
    if (initial.size === 0) return;

    const currentIds = new Set(items.map((i) => i.id));
    const allInitialGone = [...initial].every((id) => !currentIds.has(id));
    if (allInitialGone) {
      const id = setTimeout(() => setRaceNotice(true), 0);
      return () => clearTimeout(id);
    }
  }, [items, visible]);

  // Auto-dismiss after showing race notice
  useEffect(() => {
    if (!raceNotice) return;
    const timer = setTimeout(() => {
      setRaceNotice(false);
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [raceNotice, onClose]);

  // Resets transient state so the next open is always clean
  function handleClose() {
    setRaceNotice(false);
    setConfirmError(null);
    onClose();
  }

  async function handleConfirm() {
    confirmingRef.current = true;
    setConfirming(true);
    setConfirmError(null);
    const { error, raceLost } = await onConfirm();
    confirmingRef.current = false;
    setConfirming(false);
    if (error) {
      setConfirmError(error);
      return;
    }
    if (raceLost) {
      setRaceNotice(true);
      return;
    }
    handleClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {raceNotice ? (
            <View style={styles.raceContainer}>
              <Text style={styles.raceText}>
                Another household member already ended this trip. Your list has been updated.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>End {storeName} Trip?</Text>
              <Text style={styles.subtitle}>
                This will clear all checked items from your {storeName} list.
              </Text>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                bounces={false}
              >
                {checkedItems.map((item) => (
                  <View key={item.id} style={styles.row}>
                    <Text style={styles.checkmark}>✓</Text>
                    <Text style={styles.itemNameChecked} numberOfLines={2}>
                      {item.name}
                      {item.quantity != null
                        ? ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})`
                        : ''}
                    </Text>
                  </View>
                ))}

                {uncheckedItems.length > 0 && (
                  <>
                    <Text style={styles.remainLabel}>
                      {uncheckedItems.length} unchecked item
                      {uncheckedItems.length !== 1 ? 's' : ''} will stay:
                    </Text>
                    {uncheckedItems.map((item) => (
                      <View key={item.id} style={styles.row}>
                        <Text style={styles.circle}>○</Text>
                        <Text style={styles.itemNameUnchecked} numberOfLines={2}>
                          {item.name}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>

              {/* EC5-3: zero checked items in modal */}
              {checkedItems.length === 0 && (
                <Text style={styles.noCheckedNote}>
                  Check off items before ending your trip.
                </Text>
              )}

              {confirmError !== null && (
                <Text style={styles.errorText}>{confirmError}</Text>
              )}

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.confirmBtn,
                    (checkedItems.length === 0 || confirming) && styles.confirmBtnDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={checkedItems.length === 0 || confirming}
                  accessibilityLabel="Confirm end trip"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: checkedItems.length === 0 || confirming }}
                >
                  {confirming ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.confirmLabel,
                        checkedItems.length === 0 && styles.confirmLabelDisabled,
                      ]}
                    >
                      End Trip
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={confirming}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  accessibilityState={{ disabled: confirming }}
                >
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingBottom: 36,
    paddingHorizontal: 24,
    maxHeight: '80%',
    ...Platform.select({
      android: { elevation: 12 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      web: { boxShadow: '0px -4px 16px rgba(0,0,0,0.12)' } as object,
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  scroll: {
    maxHeight: 320,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    gap: 10,
  },
  checkmark: {
    fontSize: 15,
    color: '#16a34a',
    fontWeight: '700',
    width: 18,
    marginTop: 1,
  },
  circle: {
    fontSize: 15,
    color: '#9ca3af',
    width: 18,
    marginTop: 1,
  },
  itemNameChecked: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  itemNameUnchecked: {
    flex: 1,
    fontSize: 15,
    color: '#6b7280',
  },
  remainLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noCheckedNote: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
  confirmBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  confirmLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmLabelDisabled: {
    color: '#dbeafe',
  },
  cancelBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  raceContainer: {
    paddingVertical: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  raceText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
});
