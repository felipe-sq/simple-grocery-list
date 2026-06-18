import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import type { SpeechState, UseSpeechReturn } from './useSpeech';

const SILENCE_TIMEOUT_MS = 8000;

export function useSpeech(): UseSpeechReturn {
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [canAskPermission, setCanAskPermission] = useState(true);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      ExpoSpeechRecognitionModule.stop();
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (!event.isFinal) {
      armSilenceTimer();
    } else {
      clearSilenceTimer();
    }
  });

  useSpeechRecognitionEvent('end', () => {
    clearSilenceTimer();
    setState((prev) => (prev === 'listening' ? 'done' : prev));
  });

  useSpeechRecognitionEvent('error', (event) => {
    clearSilenceTimer();
    setState((prev) => {
      if (prev !== 'listening') return prev;
      return event.error === 'no-speech' ? 'no-speech' : 'error';
    });
  });

  useEffect(() => () => { clearSilenceTimer(); }, [clearSilenceTimer]);

  const start = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      setCanAskPermission(result.canAskAgain);
      setState('permission-denied');
      return;
    }
    setTranscript('');
    setState('listening');
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });
    armSilenceTimer();
  }, [armSilenceTimer]);

  const stop = useCallback(() => {
    clearSilenceTimer();
    ExpoSpeechRecognitionModule.stop();
  }, [clearSilenceTimer]);

  const reset = useCallback(() => {
    clearSilenceTimer();
    setState('idle');
    setTranscript('');
    setCanAskPermission(true);
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // no active recognition session
    }
  }, [clearSilenceTimer]);

  return { state, transcript, start, stop, reset, canAskPermission };
}
