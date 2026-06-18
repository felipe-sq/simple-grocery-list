// Shared interface for the platform-split speech recognition hook.
// Platform implementations: useSpeech.ios.ts, useSpeech.web.ts
// This base file also serves as the Android stub (speech not supported in v1).

export type SpeechState =
  | 'idle'
  | 'listening'
  | 'done'
  | 'no-speech'
  | 'permission-denied'
  | 'error';

export type UseSpeechReturn = {
  state: SpeechState;
  transcript: string;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  canAskPermission: boolean;
};

// Stub for platforms without speech support (Android in v1).
export function useSpeech(): UseSpeechReturn {
  return {
    state: 'idle',
    transcript: '',
    start: async () => {},
    stop: () => {},
    reset: () => {},
    canAskPermission: false,
  };
}
