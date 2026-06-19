import { useEffect, useRef } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSpeech } from '@/hooks/useSpeech';

type Props = {
  visible: boolean;
  onTranscribed: (transcript: string) => void;
  onCancel: () => void;
  onTypeInstead: () => void;
};

export function ListeningOverlay({
  visible,
  onTranscribed,
  onCancel,
  onTypeInstead,
}: Props) {
  const { state, transcript, start, stop, reset, canAskPermission } = useSpeech();
  const hasStartedRef = useRef(false);
  const transcribedRef = useRef(false);

  // Auto-start recognition when overlay opens; clean up when it closes
  useEffect(() => {
    if (visible && !hasStartedRef.current) {
      hasStartedRef.current = true;
      start();
    }
    if (!visible) {
      hasStartedRef.current = false;
      transcribedRef.current = false;
      reset();
    }
  }, [visible, start, reset]);

  // Fire onTranscribed once when recognition completes with a result
  useEffect(() => {
    if (!visible || transcribedRef.current) return;
    if (state === 'done' && transcript.trim()) {
      transcribedRef.current = true;
      onTranscribed(transcript.trim());
    }
  }, [visible, state, transcript, onTranscribed]);

  async function handleRetry() {
    reset();
    await start();
  }

  function handleCancel() {
    stop();
    reset();
    onCancel();
  }

  function renderContent() {
    // EC2-6: microphone permission denied
    if (state === 'permission-denied') {
      return (
        <View style={styles.centeredContent}>
          <Text style={styles.micIcon}>🎤</Text>
          <Text style={styles.errorHeading}>Microphone access needed</Text>
          <Text style={styles.errorBody}>
            Microphone access is needed for voice input. Enable it in Settings.
          </Text>
          {canAskPermission ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Grant microphone permission"
            >
              <Text style={styles.primaryBtnText}>Grant Permission</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open Settings to enable microphone"
            >
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.ghostBtn}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel voice input"
          >
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    // EC2-2: no speech detected, or done with empty transcript
    const isNoSpeech =
      state === 'no-speech' || (state === 'done' && !transcript.trim()) || state === 'error';

    if (isNoSpeech) {
      return (
        <View style={styles.centeredContent}>
          <Text style={styles.micIcon}>🎤</Text>
          <Text style={styles.errorHeading}>We didn't catch that.</Text>
          <Text style={styles.errorBody}>Try again?</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry voice recognition"
          >
            <Text style={styles.primaryBtnText}>Retry</Text>
          </Pressable>
          <Pressable
            style={styles.ghostBtn}
            onPress={() => { reset(); onTypeInstead(); }}
            accessibilityRole="button"
            accessibilityLabel="Type item name instead"
          >
            <Text style={styles.ghostBtnText}>Type Instead</Text>
          </Pressable>
        </View>
      );
    }

    // Listening (or idle/loading briefly before start fires)
    return (
      <View style={styles.centeredContent}>
        <Text style={styles.micIcon}>🎤</Text>
        <Text style={styles.listeningLabel}>Listening...</Text>
        {transcript.length > 0 && (
          <Text style={styles.transcriptText}>&quot;{transcript}&quot;</Text>
        )}
        <Pressable
          style={styles.ghostBtn}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel voice input"
        >
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.root}>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredContent: {
    width: '100%',
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 16,
  },
  micIcon: { fontSize: 64, marginBottom: 8 },
  listeningLabel: {
    fontSize: 22,
    fontWeight: '600',
    color: '#f9fafb',
  },
  transcriptText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    marginTop: 4,
  },
  errorHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f9fafb',
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ghostBtn: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  ghostBtnText: { color: '#9ca3af', fontSize: 15 },
});
