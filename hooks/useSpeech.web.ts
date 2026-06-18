import { useCallback, useEffect, useRef, useState } from 'react';

import type { SpeechState, UseSpeechReturn } from './useSpeech';

// SpeechRecognition is not in TypeScript's DOM lib; declare the minimum we need.
interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  }
}

const SILENCE_TIMEOUT_MS = 8000;

export function useSpeech(): UseSpeechReturn {
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [canAskPermission, setCanAskPermission] = useState(true);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      recognitionRef.current?.abort();
    };
  }, [clearSilenceTimer]);

  const start = useCallback(async () => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setState('error');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      clearSilenceTimer();
      const result = event.results[event.results.length - 1];
      const text = result[0]?.transcript ?? '';
      setTranscript(text);
      if (!result.isFinal) {
        silenceTimerRef.current = setTimeout(
          () => recognition.stop(),
          SILENCE_TIMEOUT_MS,
        );
      }
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setState((prev) => (prev === 'listening' ? 'done' : prev));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer();
      setState((prev) => {
        if (prev !== 'listening') return prev;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setCanAskPermission(false);
          return 'permission-denied';
        }
        return event.error === 'no-speech' ? 'no-speech' : 'error';
      });
    };

    setTranscript('');
    setState('listening');
    recognition.start();
    silenceTimerRef.current = setTimeout(
      () => recognition.stop(),
      SILENCE_TIMEOUT_MS,
    );
  }, [clearSilenceTimer]);

  const stop = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
  }, [clearSilenceTimer]);

  const reset = useCallback(() => {
    clearSilenceTimer();
    setState('idle');
    setTranscript('');
    setCanAskPermission(true);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, [clearSilenceTimer]);

  return { state, transcript, start, stop, reset, canAskPermission };
}
