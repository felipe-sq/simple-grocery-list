import { useCallback, useLayoutEffect } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';

type SheetModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Percentage height of the sheet. Default '85%'. */
  snapPoint?: `${number}%`;
  /** Set false for sheets with no text inputs to skip keyboard avoidance. Default true. */
  hasKeyboardInput?: boolean;
  /** Backdrop press behavior. Default 'close' (matches pre-refactor web behavior). */
  backdropPressBehavior?: 'none' | 'close';
  children: React.ReactNode;
};

type SheetScrollViewProps = {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Drop-in scroll container for use inside SheetModal. */
export function SheetScrollView({ style, contentContainerStyle, children }: SheetScrollViewProps) {
  return (
    <ScrollView
      style={[styles.scrollFlex, style]}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/**
 * Cross-platform slide-up sheet container built on RN Modal.
 * (Previously used @gorhom/bottom-sheet on native; its BottomSheetModal
 * silently fails to present under this app's Reanimated/new-architecture
 * combination — present() runs, nothing renders. RN Modal works everywhere.)
 * Children are responsible for their own header / scroll / footer layout.
 */
export function SheetModal({
  visible,
  onClose,
  snapPoint = '85%',
  hasKeyboardInput = true,
  backdropPressBehavior = 'close',
  children,
}: SheetModalProps) {
  // On web, blur any focused element before the Modal hides itself with aria-hidden.
  // useLayoutEffect fires synchronously after DOM commits, before paint — early enough
  // to move focus away before the browser logs the aria-hidden/focus conflict warning.
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || visible) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [visible]);

  // Blur before calling onClose so focus moves before the parent sets visible=false.
  const handleClose = useCallback(() => {
    if (Platform.OS === 'web' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  }, [onClose]);

  const themed = useThemedStyles((c) => ({
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: 'hidden' as const,
      height: snapPoint,
    },
  }));

  const sheet = <View style={themed.sheet}>{children}</View>;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={backdropPressBehavior === 'close' ? handleClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        {hasKeyboardInput && Platform.OS === 'ios' ? (
          <KeyboardAvoidingView behavior="padding">{sheet}</KeyboardAvoidingView>
        ) : (
          sheet
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  scrollFlex: { flex: 1 },
});
