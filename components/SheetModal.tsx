import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

type SheetModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Percentage height for native snap point and web sheet height. Default '85%'. */
  snapPoint?: `${number}%`;
  /** Set false for sheets with no text inputs to skip keyboard avoidance. Default true. */
  hasKeyboardInput?: boolean;
  /** Native backdrop press behavior. Default 'none' (only X button closes). */
  backdropPressBehavior?: 'none' | 'close';
  children: React.ReactNode;
};

type SheetScrollViewProps = {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Drop-in scroll container for use inside SheetModal.
 * Renders BottomSheetScrollView on native, ScrollView on web.
 */
export function SheetScrollView({ style, contentContainerStyle, children }: SheetScrollViewProps) {
  if (Platform.OS === 'web') {
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
  return (
    <BottomSheetScrollView
      style={[styles.scrollFlex, style]}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </BottomSheetScrollView>
  );
}

/**
 * Cross-platform slide-up sheet container.
 * Uses BottomSheetModal on native, React Native Modal on web.
 * Children are responsible for their own header / scroll / footer layout.
 */
export function SheetModal({
  visible,
  onClose,
  snapPoint = '85%',
  hasKeyboardInput = true,
  backdropPressBehavior = 'none',
  children,
}: SheetModalProps) {
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => [snapPoint], [snapPoint]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (visible) {
      modalRef.current?.present();
    } else {
      modalRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior={backdropPressBehavior}
      />
    ),
    [backdropPressBehavior],
  );

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View style={[styles.sheet, { height: snapPoint }]}>
            {children}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      backdropComponent={renderBackdrop}
      keyboardBehavior={hasKeyboardInput ? 'interactive' : undefined}
      keyboardBlurBehavior={hasKeyboardInput ? 'restore' : undefined}
      onDismiss={onClose}
    >
      {children}
    </BottomSheetModal>
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
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  scrollFlex: { flex: 1 },
});
